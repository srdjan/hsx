import type { Renderable, VNode } from "./jsx-runtime.ts";
import { Fragment } from "./jsx-runtime.ts";
import {
  type RenderContext,
  type Props,
  normalizeFormProps,
  normalizeButtonProps,
  normalizeAnchorProps,
  normalizeGenericHsxProps,
} from "./hsx-normalize.ts";

const VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input","link",
  "meta","param","source","track","wbr"
]);

/**
 * Raw text elements per HTML spec - content is NOT HTML-escaped.
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

/** Map of characters to their HTML entity equivalents */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ESCAPE_RE = /[&<>"']/g;

/**
 * Escape HTML special characters in text content.
 * Uses single-pass regex for performance.
 */
function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Escape characters for safe use in HTML attributes.
 * Includes single quote escaping for attributes using single quotes.
 */
function escapeAttr(text: string): string {
  return escapeHtml(text);
}

/**
 * Valid CSS property name pattern.
 * Accepts standard properties (letters, hyphens after first char) and
 * CSS custom properties (--variable-name).
 * Prevents CSS injection via malicious property names like "color;background:url(...)".
 */
const CSS_PROPERTY_RE = /^(-{2}[a-zA-Z0-9_-]+|[a-zA-Z][a-zA-Z-]*)$/;

/**
 * Check if a value is a valid CSS property value (string or finite number).
 * Rejects NaN, Infinity, and non-primitive values.
 */
function isValidStyleValue(v: unknown): v is string | number {
  if (typeof v === "string") return true;
  if (typeof v === "number") return Number.isFinite(v);
  return false;
}

/**
 * Convert a style object to a CSS string.
 * Sanitizes property names and values to prevent CSS injection.
 *
 * Security measures:
 * - Property names must match /^[a-zA-Z][a-zA-Z-]*$/ (no semicolons, colons, etc.)
 * - Values must be strings or finite numbers (no NaN, Infinity)
 * - Value strings have ;{} removed to prevent breaking out of CSS context
 */
function styleObjectToCss(style: Record<string, string | number>): string {
  return Object.entries(style)
    .filter(([k, v]) => {
      // Validate property name (prevent injection via keys like "color;background:url(...)")
      if (!CSS_PROPERTY_RE.test(k)) return false;
      // Validate value (prevent NaN, Infinity, non-primitives)
      if (!isValidStyleValue(v)) return false;
      return true;
    })
    .map(([k, v]) => {
      // convert camelCase to kebab-case
      const prop = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      // Sanitize value: remove characters that could break out of CSS context,
      // then neutralize dangerous CSS functions (url, expression, @import)
      const safeValue = String(v)
        .replace(/[;{}]/g, "")
        .replace(/url\s*\(/gi, "/* blocked */")
        .replace(/expression\s*\(/gi, "/* blocked */")
        .replace(/@import/gi, "/* blocked */");
      return `${prop}:${safeValue};`;
    })
    .join("");
}

function propsToAttrs(props: Props): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (
      key === "children" ||
      value === undefined ||
      value === null ||
      typeof value === "function"
    ) continue;

    const attrName = key === "className" ? "class" : key;

    if (typeof value === "boolean") {
      if (value) parts.push(` ${attrName}`);
      continue;
    }

    if (key === "style" && value && typeof value === "object" && !Array.isArray(value)) {
      parts.push(` style="${escapeAttr(styleObjectToCss(value as Record<string, string | number>))}"`);
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      parts.push(` ${attrName}="${escapeAttr(String(value))}"`);
      continue;
    }

    // Fallback: JSON stringify for objects (hx-vals, hx-headers, etc.)
    try {
      parts.push(
        ` ${attrName}="${escapeAttr(JSON.stringify(value))}"`,
      );
    } catch (e) {
      if (e instanceof TypeError && String(e.message).includes("circular")) {
        throw new Error(
          `Cannot serialize attribute "${attrName}": circular reference detected. ` +
          `Ensure objects passed to hx-vals, hx-headers, etc. are JSON-serializable.`
        );
      }
      throw e;
    }
  }
  return parts.join("");
}

function isVNode(x: unknown): x is VNode {
  return (
    typeof x === "object" &&
    x !== null &&
    "type" in x &&
    "props" in x
  );
}

function assertNoManualHxProps(tag: string, props: Props): void {
  for (const key of Object.keys(props)) {
    if (key.startsWith("hx-")) {
      throw new Error(
        `Manual hx-* props are disallowed; use HSX aliases (get/post/target/...) instead. Found ${key} on <${tag}>.`,
      );
    }
  }
}

/**
 * Enforce render limits to prevent DoS attacks.
 * Throws if maxDepth or maxNodes is exceeded.
 */
function enforceLimits(ctx: RenderContext): void {
  if (ctx.maxDepth !== undefined && ctx.depth >= ctx.maxDepth) {
    throw new Error(
      `Maximum render depth exceeded: ${ctx.maxDepth} (at depth ${ctx.depth})`,
    );
  }
  if (ctx.maxNodes !== undefined && ctx.nodes >= ctx.maxNodes) {
    throw new Error(
      `Maximum node count exceeded: ${ctx.maxNodes} (at node ${ctx.nodes})`,
    );
  }
  ctx.nodes++;
}

/**
 * Normalize props based on element type.
 * Maps HSX attributes to hx-* attributes.
 */
function normalizeProps(tag: string, props: Props, ctx: RenderContext): Props {
  switch (tag) {
    case "form":
      return normalizeFormProps(props, ctx);
    case "button":
      return normalizeButtonProps(props, ctx);
    case "a":
      return normalizeAnchorProps(props, ctx);
    default:
      return normalizeGenericHsxProps(props, ctx);
  }
}

/**
 * Render a function component (including Fragment).
 */
function renderComponent(node: VNode, ctx: RenderContext): string {
  ctx.depth++;
  try {
    if (node.type === Fragment) {
      return renderNode(node.props.children, ctx);
    }
    const component = node.type as (props: unknown) => Renderable;
    const rendered = component(node.props);
    return renderNode(rendered, ctx);
  } finally {
    ctx.depth--;
  }
}

/**
 * Render raw text content (for script/style elements) without HTML escaping.
 * Only accepts string/number children - other types are ignored.
 */
function renderRawText(node: Renderable): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (Array.isArray(node)) {
    return node.map(renderRawText).join("");
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  // Non-string content in raw text elements is ignored
  return "";
}

/**
 * Render a native HTML element.
 */
function renderElement(node: VNode, ctx: RenderContext): string {
  const tag = node.type as string;
  const rawProps = (node.props ?? {}) as Props;

  // Reject manual hx-* usage; HSX normalization is the only allowed path.
  assertNoManualHxProps(tag, rawProps);

  const props = normalizeProps(tag, rawProps, ctx);
  const attrs = propsToAttrs(props);
  const children = props.children as Renderable;

  // Void elements have no children or closing tag
  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrs}>`;
  }

  // Raw text elements (script, style): do NOT escape content
  if (RAW_TEXT_ELEMENTS.has(tag)) {
    const inner = renderRawText(children);
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }

  // Render children with incremented depth
  ctx.depth++;
  try {
    const inner = renderNode(children, ctx);

    // Special handling for <body>: inject HTMX script if needed
    if (tag === "body") {
      const shouldInject = ctx.injectHtmxOverride === true
        ? true
        : ctx.injectHtmxOverride === false
          ? false
          : ctx.usesHtmx;
      const script = shouldInject
        ? `<script src="/static/htmx.js"></script>`
        : "";
      return `<body${attrs}>${inner}${script}</body>`;
    }

    return `<${tag}${attrs}>${inner}</${tag}>`;
  } finally {
    ctx.depth--;
  }
}

/**
 * Render a node (element, component, or primitive) to an HTML string.
 */
function renderNode(node: Renderable, ctx: RenderContext): string {
  enforceLimits(ctx);

  // Primitives: null, undefined, boolean render as empty
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  // Arrays: render each child and concatenate
  if (Array.isArray(node)) {
    return node.map((n) => renderNode(n, ctx)).join("");
  }

  // Text: escape and return
  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node));
  }

  // Non-VNode objects: convert to string and escape
  if (!isVNode(node)) {
    return escapeHtml(String(node));
  }

  // Function components
  if (typeof node.type === "function") {
    return renderComponent(node, ctx);
  }

  // Native HTML elements
  return renderElement(node, ctx);
}

/**
 * Options for controlling the rendering process.
 */
export interface RenderHtmlOptions {
  /**
   * Maximum nesting depth allowed before throwing an error.
   * Prevents stack overflow from deeply nested component trees.
   * @default undefined (no limit)
   */
  maxDepth?: number;

  /**
   * Maximum number of nodes to render before throwing an error.
   * Prevents DoS attacks from extremely large trees.
   * @default undefined (no limit)
   */
  maxNodes?: number;

  /**
   * Control HTMX script injection.
   * - true: always inject
   * - false: never inject
   * - undefined: auto (inject when HSX is used)
   */
  injectHtmx?: boolean;
}

/**
 * Render a JSX tree to an HTML string.
 *
 * Processes the JSX tree, normalizes HSX attributes to hx-* attributes,
 * and automatically injects the HTMX script tag when HTMX features are used.
 *
 * Note: Does NOT include `<!DOCTYPE html>`. Add it manually if needed.
 *
 * @param node - The JSX element or component to render
 * @param options - Rendering options (maxDepth, maxNodes)
 * @param options.injectHtmx - Force (true) or suppress (false) HTMX script injection. Default auto based on HSX usage.
 * @returns The rendered HTML string
 *
 * @throws {Error} If maxDepth is exceeded
 * @throws {Error} If maxNodes is exceeded
 *
 * @example
 * ```tsx
 * function Page() {
 *   return (
 *     <html>
 *       <body>
 *         <h1>Hello</h1>
 *         <button get="/api/data">Load</button>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * const html = renderHtml(<Page />);
 * // Returns: <html><body><h1>Hello</h1><button hx-get="/api/data">Load</button><script src="/static/htmx.js"></script></body></html>
 * ```
 */
export function renderHtml(
  node: Renderable,
  options: RenderHtmlOptions = {},
): string {
  const ctx: RenderContext = {
    depth: 0,
    nodes: 0,
    maxDepth: options.maxDepth,
    maxNodes: options.maxNodes,
    usesHtmx: false,
    injectHtmxOverride: options.injectHtmx,
  };
  return renderNode(node, ctx);
}

/**
 * Render a JSX tree directly to an HTTP Response.
 *
 * Convenience wrapper around `renderHtml` that returns a Response object
 * suitable for use with Deno.serve() or similar HTTP frameworks.
 *
 * @param node - The JSX element or component to render
 * @param options - Rendering and response options
 * @param options.status - HTTP status code (default: 200)
 * @param options.headers - Additional headers to include
 * @param options.maxDepth - Maximum nesting depth
 * @param options.maxNodes - Maximum node count
 * @param options.injectHtmx - Force (true) or suppress (false) HTMX script injection. Default auto.
 * @returns HTTP Response with HTML content
 *
 * @example
 * ```tsx
 * Deno.serve((_req) => render(<Page />));
 *
 * // With custom status:
 * return render(<NotFound />, { status: 404 });
 *
 * // With custom headers:
 * return render(<Page />, {
 *   headers: { "X-Custom-Header": "value" }
 * });
 * ```
 */
export function render(
  node: Renderable,
  options: RenderHtmlOptions & { status?: number; headers?: HeadersInit } = {},
): Response {
  const html = renderHtml(node, options);
  return new Response(html, {
    status: options.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(typeof options.headers === "object" ? options.headers : {}),
    },
  });
}
