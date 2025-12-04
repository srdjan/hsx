# HSX Overview

HSX is a small, opinionated JSX/TSX renderer for **server-side rendering only**. It treats HTMX-style interactions as if they were a natural part of HTML, then compiles them to `hx-*` attributes on the server.

## Goals

- **Ergonomic authoring**: JSX should feel like HTML from a future where HTMX semantics (`get`, `post`, `target`, `swap`, `trigger`, `vals`, `headers`) are part of the spec.
- **SSR-only**: No client-side HSX runtime; the browser sees only HTML + `hx-*` attributes and an HTMX script.
- **Typed routes & IDs**: Routes and target element references should be type-safe.
- **Co-located components**: Route + handler + render live together with shared types.
- **Guarded pages**: Full-page layouts can opt into structural/styling guardrails.
- **HTMX as implementation detail**: You never write `hx-` manually or add the HTMX `<script>` tag yourself.

## Architecture

HSX consists of several modules that work together:

```
JSX Code → jsx-runtime → VNode Tree → render → HTML String
                                         ↓
                              hsx-normalize (HSX → hx-*)
                                         ↓
                              HTMX script injection
```

### Module Responsibilities

**jsx-runtime.ts**
- Minimal JSX factory functions (`jsx`, `jsxs`, `jsxDEV`)
- Creates VNode tree from JSX
- Defines core types: `VNode`, `Renderable`, `ComponentType`

**render.ts**
- Walks VNode tree recursively
- Calls normalization for HSX elements
- Handles HTML escaping for XSS prevention
- Injects HTMX script when needed
- Provides DoS protection via depth/node limits

**hsx-normalize.ts**
- Maps HSX attributes to `hx-*` attributes
- Resolves Route objects to URLs
- Handles element-specific normalization (form, button, a, etc.)
- Lazy copy optimization (only copies props when needed)

**hsx-types.ts**
- `Route<Path, Params>` - Type-safe routes
- `Id<Name>` - Branded element IDs
- `HsxSwap`, `HsxTrigger` - HTMX type unions

**hsx-component.ts**
- `hsxComponent()` factory for co-locating route + handler + render
- `match()` for pathname matching and param extraction
- `handle()` to run the handler and render a Response (fragment or full page)

**hsx-page.ts**
- `hsxPage()` wrapper for full `<html>` pages
- Validates semantic structure (head/body order) and styling constraints
- Convenience `render()` helper for serving the page

**hsx-jsx.d.ts**
- TypeScript JSX declarations
- Augments intrinsic elements with HSX attributes

## Render Pipeline

1. **JSX Parsing**: TypeScript/Deno compiles JSX to `jsx()` calls
2. **VNode Creation**: `jsx-runtime` creates a tree of VNodes
3. **Tree Walking**: `render.ts` recursively processes each node
4. **Normalization**: HSX attributes converted to `hx-*` for each element
5. **HTML Generation**: Nodes rendered to HTML strings with escaping
6. **Script Injection**: HTMX script added before `</body>` if needed
7. **Response**: HTML string wrapped in Response (or returned directly)

## Security Model

HSX follows these security principles:

- **HTML Escaping**: All text content and attribute values are escaped
- **Raw Text Elements**: `<script>` and `<style>` children are NOT escaped (by design)
- **No Manual hx-***: Manual `hx-*` attributes throw at render time
- **DoS Protection**: Optional `maxDepth` and `maxNodes` limits

## Type Safety

HSX provides compile-time safety for:

- **Routes**: Path parameters are extracted and validated
- **IDs**: Branded types ensure consistent targeting
- **Attributes**: Only valid HSX attributes are allowed on elements
- **HSX Components**: `handler` return values must match `render` props

## Performance Considerations

- **Lazy Copy**: Props are only copied when HSX attributes are present
- **Single Pass**: HTML escaping uses regex for efficiency
- **No Runtime**: Zero client-side overhead
- **Stateless**: Each render is independent (no caching between requests)
