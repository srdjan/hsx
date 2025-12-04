# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is HSX?

HSX is an SSR-only JSX/TSX renderer for Deno that treats HTMX-style interactions as native HTML attributes. It compiles `get`, `post`, `target`, `swap`, `trigger`, `vals`, `headers` attributes to `hx-*` attributes on the server. The browser never sees HSX attributes—only standard HTML with HTMX.

## Commands

```bash
# Run examples
deno task example:todos      # Todos example on port 8000
deno task example:identity   # Identity widget example

# Run any server file directly
deno run --allow-net --allow-read examples/todos/server.ts
```

## Architecture

**JSX Transform Pipeline:**
1. `jsx-runtime.ts` - Minimal JSX runtime producing VNode tree
2. `render.ts` - Walks VNode tree, normalizes HSX props per element type, auto-injects HTMX script before `</body>` when needed
3. `hsx-normalize.ts` - Maps HSX attributes → `hx-*` attributes, tracks HTMX usage via RenderContext

**Type System:**
- `hsx-types.ts` - `Route<Path, Params>` for type-safe URLs, `Id<Name>` branded `#name` strings, `HsxSwap`/`HsxTrigger` unions
- `hsx-jsx.d.ts` - Augments JSX.IntrinsicElements for `form`, `button`, `a`, `div` with HSX attributes (index signature removed to catch tag typos)

**Rule:** Manual `hx-*` attributes are not allowed; render throws if they are present. Always use HSX aliases (`get/post/put/patch/delete`, `target`, `swap`, `trigger`, `vals`, `headers`, `behavior="boost"`).

**Render options:** `render` / `renderHtml` accept `injectHtmx?: boolean` to force or suppress the injected HTMX script; default is auto based on HSX usage.

**Styling:** Style objects are supported; they render to inline CSS (`backgroundColor` → `background-color`).

**Safety:** `script`/`style` children are emitted verbatim (no escaping); never pass user input there.

**Entry Points (Modular):**
- `index.ts` (`.`) - Everything: `render`, `renderHtml`, `route`, `id`, `Fragment`, `hsxComponent`, `hsxPage`
- `core.ts` (`./core`) - Core rendering: `render`, `renderHtml`, `route`, `id`, `Fragment`, types
- `component-model.ts` (`./component-model`) - Higher-level: `hsxComponent`, `hsxPage`
- `styles.ts` (`./styles`) - Optional CSS: `hsxStyles`, `hsxStylesDark`, `HSX_STYLES_PATH`
- `jsx-runtime.ts` (`./jsx-runtime`) - JSX compiler requirement (not for direct import)

## Key Patterns

**Type-safe routes** - Define with `route()`, use in JSX attributes:
```ts
const routes = { todos: { list: route("/todos", () => "/todos") } };
<form post={routes.todos.list}>...</form>  // → hx-post="/todos"
```

**Branded IDs** - Create with `id()`, use in `target`:
```ts
const ids = { list: id("todo-list") };  // Type: Id<"todo-list"> = "#todo-list"
<button get="..." target={ids.list}>    // → hx-target="#todo-list"
```

**HSX attributes on elements:**
- `get`, `post`, `put`, `patch`, `delete` → `hx-get`, etc.
- `target`, `swap`, `trigger`, `vals`, `headers` → `hx-target`, etc.
- `<a behavior="boost">` → `hx-boost="true"`

**HTMX script injection** - Automatic when any HSX attribute is used; served from `/static/htmx.js` (you must serve vendored HTMX).

## JSX Configuration

Files using JSX need either:
- Pragma: `/** @jsxImportSource ./src */` at file top
- Or rely on `deno.json` compilerOptions (already configured)
