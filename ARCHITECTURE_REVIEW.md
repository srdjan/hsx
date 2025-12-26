# HSX Architecture Review & Analysis

> **Reviewed:** 2025-12-26
> **Codebase Version:** 1.0.0
> **Total LOC:** ~1,914 (core) + ~2,120 (examples)

---

## Executive Summary

HSX is a well-designed, minimal SSR-only JSX renderer for HTMX applications. The architecture is clean and pragmatic, but several issues need attention ranging from **critical security vulnerabilities** to **type system gaps** and **missing infrastructure**.

### Key Findings by Severity

| Severity | Count | Categories |
|----------|-------|------------|
| **Critical** | 2 | Security (CSS injection, unhandled errors) |
| **High** | 4 | Security, Error Handling, Type Safety |
| **Medium** | 8 | Edge Cases, Performance, Documentation |
| **Low** | 6 | Code Quality, Minor Improvements |

---

## 1. CRITICAL SECURITY ISSUES

### 1.1 CSS Injection via Style Object Property Names

**File:** `packages/hsx/render.ts:50-58`

```typescript
function styleObjectToCss(style: Record<string, string | number>): string {
  return Object.entries(style)
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      return `${prop}:${v};`;  // Property name 'k' is NOT sanitized
    })
    .join("");
}
```

**Attack Vector:**
```tsx
const userStyle = {
  "color;background:url(javascript:alert('xss'))": "red"
};
<div style={userStyle}>Injected</div>
// Renders: style="color;background:url(javascript:alert('xss')):red;"
```

**Impact:** XSS via CSS injection if style objects contain user-controlled keys.

**Recommendation:** Validate and sanitize CSS property names:
```typescript
const CSS_PROPERTY_RE = /^[a-zA-Z-]+$/;
function styleObjectToCss(style: Record<string, string | number>): string {
  return Object.entries(style)
    .filter(([k]) => CSS_PROPERTY_RE.test(k))
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      return `${prop}:${String(v).replace(/[;{}]/g, '')};`;
    })
    .join("");
}
```

---

### 1.2 Unhandled Async Handler Errors Crash Server

**File:** `packages/hsx/hsx-component.ts:217-246`

```typescript
const handle = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const params = match(url.pathname);

  if (params === null) {
    return new Response("Not Found", { status: 404 });
  }

  // No try-catch! Handler errors propagate as unhandled rejections
  const props = await handler(req, params);
  const rendered = renderFn(props);
  // ...
};
```

**Impact:** Any error in handler or render function causes:
1. Unhandled promise rejection
2. Server crash or undefined behavior
3. No error response to client

**Recommendation:**
```typescript
const handle = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const params = match(url.pathname);

    if (params === null) {
      return new Response("Not Found", { status: 404 });
    }

    const props = await handler(req, params);
    const rendered = renderFn(props);
    // ...
  } catch (error) {
    console.error(`[HSX] Error handling ${req.url}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
```

---

## 2. HIGH SEVERITY ISSUES

### 2.1 Target Attribute Type Conflicts

**Files:** `packages/hsx/jsx-runtime.ts:204-212, 214-225, 333, 335`

The `target` attribute has conflicting meanings:

```typescript
// AnchorAttrs (line 206)
interface AnchorAttrs extends GlobalAttrs {
  target?: string;  // HTML: "_blank", "_self", etc.
}

// HsxAttrs (line 60)
type HsxAttrs = {
  target?: Id<string> | string;  // HTMX: "#element-id"
};

// Combined (line 335) - creates semantic conflict!
a: AnchorAttrs & HsxAttrs & { behavior?: "boost" | "link" } & ExtensibleAttrs;
```

**Problem:** Developers can use `target="_blank"` (HTML window targeting) or `target="#list"` (HTMX element targeting) on `<a>` tags, but they're semantically incompatible.

**Recommendation:**
- Rename HTMX target to `hsxTarget` or `swapTarget`
- Or provide clear documentation on precedence

---

### 2.2 Input Elements Accept HSX Attributes (Type vs. Runtime Mismatch)

**File:** `packages/hsx/jsx-runtime.ts:342` vs `examples/hsx-components/server.tsx:56-64`

Type definition says no HSX:
```typescript
input: InputAttrs & ExtensibleAttrs;  // No HsxAttrs!
```

But example uses HSX on input:
```tsx
<input
  type="checkbox"
  post={TodoToggle}        // This shouldn't work per types
  params={{ id: t.id }}    // But ExtensibleAttrs allows it
  target={ids.list}
/>
```

**Impact:**
- Types don't match documented/expected behavior
- `ExtensibleAttrs = Record<string, unknown>` bypasses all type safety
- Confusing for users

**Recommendation:** Either:
1. Add `HsxAttrs` to `input` if intentional
2. Fix the example to use proper patterns (wrap in container)

---

### 2.3 Missing URL Parameter Validation

**File:** `packages/hsx/hsx-component.ts:202-210`

```typescript
const build = (params: Params): string => {
  let result = path as string;
  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, String(value));  // No validation!
    }
  }
  return result;  // Returns "/users/:id" if params.id missing!
};
```

**Problems:**
1. Missing params leave `:param` in URL
2. No path traversal prevention (`../../../etc/passwd`)
3. No URL encoding

**Recommendation:**
```typescript
const build = (params: Params): string => {
  let result = path as string;
  const missing: string[] = [];

  result = result.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    if (params && name in params) {
      return encodeURIComponent(String(params[name]));
    }
    missing.push(name);
    return `:${name}`;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required params: ${missing.join(', ')}`);
  }
  return result;
};
```

---

### 2.4 Circular Reference Crashes JSON.stringify

**File:** `packages/hsx/render.ts:87-90`

```typescript
// Fallback: JSON stringify for objects (hx-vals, hx-headers, etc.)
parts.push(
  ` ${attrName}="${escapeAttr(JSON.stringify(value))}"`,
);
```

**Impact:** Circular objects cause uncaught `TypeError: Converting circular structure to JSON`.

**Recommendation:**
```typescript
try {
  parts.push(` ${attrName}="${escapeAttr(JSON.stringify(value))}"`);
} catch (e) {
  if (e instanceof TypeError && e.message.includes('circular')) {
    throw new Error(`Circular reference in attribute "${attrName}"`);
  }
  throw e;
}
```

---

## 3. MEDIUM SEVERITY ISSUES

### 3.1 Async Components Break hsxPage Validation

**File:** `packages/hsx/hsx-page.ts:196-199`

```typescript
if (typeof node.type === "function") {
  const rendered = (node.type as ComponentType)(node.props);
  // If component is async, 'rendered' is a Promise!
  validateNode(rendered, ancestors.concat([...]), depth + 1);
  return;
}
```

**Impact:** Async components execute during validation and produce Promise objects that fail validation with confusing errors.

**Recommendation:** Detect and reject async components:
```typescript
if (typeof node.type === "function") {
  const rendered = (node.type as ComponentType)(node.props);
  if (rendered instanceof Promise) {
    throw new Error(
      `Async components are not supported in hsxPage. ` +
      `Component: ${componentName(node.type)}`
    );
  }
  validateNode(rendered, ...);
}
```

---

### 3.2 Path Parameters Limited to 5 Segments (Undocumented)

**File:** `packages/hsx/hsx-types.ts:21-41`

```typescript
type PathParams<Path extends string> =
  Path extends `/${infer A}/${infer B}/${infer C}/${infer D}/${infer E}`
    ? | ExtractSingle<A> | ... | ExtractSingle<E>
    : // 4, 3, 2, 1 segment patterns
    : never;
```

**Impact:** Routes with 6+ segments won't extract parameters beyond the 5th.

**Recommendation:** Document this limitation prominently:
```typescript
/**
 * Extract parameter names from a path template.
 *
 * **LIMITATION:** Supports up to 5 path segments. Paths with more
 * segments will only extract params from the first 5.
 *
 * @example
 * // Works (5 segments)
 * type P = ParamsFromPath<"/a/:b/c/:d/e">; // "b" | "d"
 *
 * // Partial extraction (6+ segments)
 * type P = ParamsFromPath<"/a/:b/c/:d/e/:f">; // Only "b" | "d"
 */
```

---

### 3.3 Performance: Full Validation on Every Render

**File:** `packages/hsx/hsx-page.ts:232-239`

```typescript
export function hsxPage(renderFn: () => Renderable): HsxPage {
  const Component: ComponentType = (_props) => {
    const tree = renderFn();
    validateNode(tree);  // Full tree walk every render!
    return tree;
  };
  // ...
}
```

**Impact:** For complex pages, validation overhead is repeated on every request.

**Recommendation:** Add development-only validation:
```typescript
export function hsxPage(
  renderFn: () => Renderable,
  options: { validateOnce?: boolean } = {}
): HsxPage {
  let validated = false;

  const Component: ComponentType = (_props) => {
    const tree = renderFn();
    if (!validated || !options.validateOnce) {
      validateNode(tree);
      validated = true;
    }
    return tree;
  };
  // ...
}
```

---

### 3.4 Duplicate Form Attribute Names (Dead Code)

**File:** `packages/hsx/jsx-runtime.ts:233-240`

```typescript
interface ButtonAttrs extends GlobalAttrs {
  formAction?: string;
  formaction?: string;     // lowercase duplicate
  formMethod?: string;
  formmethod?: string;     // lowercase duplicate
  formNoValidate?: boolean;
  formnovalidate?: boolean; // lowercase duplicate
  formTarget?: string;
  formtarget?: string;     // lowercase duplicate
}
```

**Issue:** Only camelCase versions are handled in `propsToAttrs()`. Lowercase versions are dead code.

**Recommendation:** Remove duplicates or add handling in render.ts.

---

### 3.5 Unsafe Type Assertion in Path Matching

**File:** `packages/hsx/hsx-component.ts:140-146`

```typescript
function matchPath<Params>(pattern: string, pathname: string): Params | null {
  // ...
  const params: Record<string, string> = {};  // All string values
  names.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return params as Params;  // Unsafe cast!
}
```

**Issue:** Actual params are `Record<string, string>` but cast to generic `Params`.

**Recommendation:** Use explicit return type:
```typescript
function matchPath(pattern: string, pathname: string): Record<string, string> | null
```

---

### 3.6 ExtensibleAttrs Bypasses Type Safety

**File:** `packages/hsx/jsx-runtime.ts:310`

```typescript
type ExtensibleAttrs = Record<string, unknown>;

// Used everywhere:
button: ButtonAttrs & HsxAttrs & ExtensibleAttrs;
```

**Issue:** Any attribute is allowed on any element, defeating type checking for typos.

**Recommendation:** Consider stricter fallback:
```typescript
type ExtensibleAttrs = {
  [key: `data-${string}`]: string | number | boolean | undefined;
  [key: `aria-${string}`]: string | number | boolean | undefined;
};
```

---

### 3.7 CLAUDE.md References Non-Existent File

**File:** `CLAUDE.md`

> "**Type System:**
> - `hsx-jsx.d.ts` - Augments JSX.IntrinsicElements..."

**Issue:** File `hsx-jsx.d.ts` doesn't exist. JSX types are in `jsx-runtime.ts`.

**Recommendation:** Update documentation to reference correct file.

---

### 3.8 Style Values Not Validated

**File:** `packages/hsx/render.ts:77-79`

```typescript
if (key === "style" && value && typeof value === "object") {
  parts.push(` style="${escapeAttr(styleObjectToCss(value as Record<string, string | number>))}"`);
}
```

**Issues:**
- `NaN`, `Infinity` produce invalid CSS
- Very large objects may exceed attribute limits
- No type validation at runtime

**Recommendation:**
```typescript
function isValidStyleValue(v: unknown): v is string | number {
  if (typeof v === 'string') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return false;
}
```

---

## 4. LOW SEVERITY ISSUES

### 4.1 No Test Coverage

**Current State:** `deno task test` outputs "No tests yet"

**Files Needing Tests:**
| Module | Priority | Test Focus |
|--------|----------|------------|
| `render.ts` | Critical | XSS prevention, escaping edge cases |
| `hsx-normalize.ts` | High | Attribute mapping correctness |
| `hsx-types.ts` | High | Path param extraction |
| `hsx-component.ts` | High | Route matching, handler flow |
| `hsx-page.ts` | Medium | Validation rules |

**Recommendation:** Add test infrastructure with minimum coverage for security-critical paths.

---

### 4.2 Missing CI Pipeline for Tests

**File:** `.github/workflows/publish.yml`

Current pipeline only runs type check:
```yaml
- name: Type check
  run: deno task check
```

**Recommendation:** Add test step when tests exist:
```yaml
- name: Run tests
  run: deno test --allow-read --allow-net

- name: Type check
  run: deno task check
```

---

### 4.3 Fragment Identity Comparison Fragility

**File:** `packages/hsx/render.ts:155`

```typescript
if (node.type === Fragment) {  // Identity comparison
  return renderNode(node.props.children, ctx);
}
```

**Issue:** If `Fragment` is imported/re-exported differently, identity comparison fails.

**Recommendation:** Use function name comparison as fallback:
```typescript
if (node.type === Fragment ||
    (typeof node.type === 'function' && node.type.name === 'Fragment')) {
  return renderNode(node.props.children, ctx);
}
```

---

### 4.4 Inconsistent Generic Default Types

**Files:** Multiple

```typescript
// jsx-runtime.ts:28
export type ComponentType<P = {}> = (props: ComponentProps<P>) => Renderable;

// hsx-component.ts:81
Props = unknown
```

**Issue:** `{}` vs `unknown` as default - inconsistent style.

**Recommendation:** Standardize on `unknown` per TypeScript best practices.

---

### 4.5 No JSDoc Examples for Core Functions

**Files:** `hsx-types.ts`, `hsx-component.ts`

Functions like `id()`, `route()` have documentation but few inline examples.

**Recommendation:** Add `@example` blocks to all public API functions.

---

### 4.6 No Error Recovery Suggestions

**File:** `packages/hsx/render.ts:107-111`

```typescript
throw new Error(
  `Manual hx-* props are disallowed; use HSX aliases (get/post/target/...) instead. Found ${key} on <${tag}>.`,
);
```

**Improvement:** Add specific suggestion:
```typescript
const suggestions: Record<string, string> = {
  'hx-get': 'get',
  'hx-post': 'post',
  // ...
};
const suggestion = suggestions[key] ? ` Use "${suggestions[key]}" instead.` : '';
throw new Error(
  `Manual hx-* props are disallowed. Found "${key}" on <${tag}>.${suggestion}`,
);
```

---

## 5. ARCHITECTURAL OBSERVATIONS

### 5.1 Strengths

1. **Zero Runtime Dependencies** - Only Deno std and vendored HTMX
2. **Clean Separation of Concerns** - Each module has single responsibility
3. **Lazy Copy Optimization** - Props only copied when mutation needed
4. **Branded Types** - Compile-time safety for routes and IDs
5. **DoS Protection** - `maxDepth` and `maxNodes` limits
6. **Semantic HTML Guardrails** - `hsxPage` enforces structural discipline

### 5.2 Design Decisions Worth Documenting

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| No async components | SSR simplicity | Limits composition patterns |
| Manual hx-* rejection | Enforce HSX pipeline | Less escape hatch flexibility |
| 5-segment path limit | Prevent infinite type recursion | Limits deep nesting |
| ExtensibleAttrs everywhere | Allow unknown attributes | Weaker type checking |
| Semantic tag style ban | Force consistent structure | Less styling flexibility |

### 5.3 Missing Architecture Components

1. **Error Boundary Pattern** - No way to catch render errors gracefully
2. **Middleware System** - No standardized request/response transformation
3. **Streaming Support** - All rendering is synchronous/buffered
4. **Hydration Markers** - No support for partial hydration patterns
5. **Dev Mode Features** - No source maps, error overlays, or hot reload hints

---

## 6. RECOMMENDATIONS BY PRIORITY

### Immediate (Pre-1.0 Stable)

1. Fix CSS injection vulnerability in `styleObjectToCss`
2. Add try-catch in `hsxComponent.handle()`
3. Add JSON.stringify error handling in `propsToAttrs`
4. Validate URL parameters in route `build()`

### Short-Term (Next Release)

1. Add unit tests for rendering pipeline
2. Resolve `target` attribute type conflict
3. Document 5-segment path limitation
4. Fix `input` element HSX type mismatch
5. Add async component detection in `hsxPage`

### Medium-Term (Future Releases)

1. Remove `ExtensibleAttrs` or restrict to data-*/aria-*
2. Add error boundary component pattern
3. Implement streaming render option
4. Add development mode with better error messages
5. Performance: cache hsxPage validation

---

## 7. SECURITY CHECKLIST

| Check | Status | Notes |
|-------|--------|-------|
| HTML text escaping | PASS | `escapeHtml()` covers &<>"' |
| HTML attribute escaping | PASS | Uses `escapeAttr()` |
| Raw text elements | WARN | `<script>/<style>` not escaped (documented) |
| CSS property names | FAIL | Not sanitized - injection possible |
| CSS property values | WARN | Special values not validated |
| URL parameters | FAIL | No encoding or validation |
| JSON in attributes | WARN | Circular refs crash |
| DoS protection | PASS | maxDepth/maxNodes limits exist |
| Manual hx-* rejection | PASS | Enforced in render |

---

## 8. METRICS SUMMARY

```
Source Files:        8 TypeScript modules
Total LOC:           ~1,914 (core)
Examples:            9 complete demos (~2,120 LOC)
Documentation:       5 guides + README
Test Coverage:       0%
External Deps:       0 (runtime)
Bundle Size:         ~35KB (minified estimate)
```

---

## Appendix A: File Reference

| File | LOC | Purpose |
|------|-----|---------|
| `jsx-runtime.ts` | 545 | JSX factory, VNode types, IntrinsicElements |
| `render.ts` | 383 | VNode → HTML, escaping, HTMX injection |
| `hsx-component.ts` | 259 | Co-located route/handler/render pattern |
| `hsx-page.ts` | 246 | Full-page validation guardrails |
| `hsx-types.ts` | 215 | Route, Id, HsxSwap, HsxTrigger types |
| `hsx-normalize.ts` | 213 | HSX → hx-* attribute mapping |
| `mod.ts` | 53 | Public API exports |

---

## Appendix B: Attack Surface Summary

```
User Input → JSX Props
              ↓
         [ESCAPING] ← escapeHtml/escapeAttr (SAFE)
              ↓
         [STYLE OBJECTS] ← styleObjectToCss (VULNERABLE)
              ↓
         [URL PARAMS] ← route.build() (VULNERABLE)
              ↓
         [JSON ATTRS] ← JSON.stringify (FRAGILE)
              ↓
         HTML Output
```

---

*End of Architecture Review*
