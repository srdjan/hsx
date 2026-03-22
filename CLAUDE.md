# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is HSX?

HSX is an SSR-only JSX/TSX renderer for Deno that treats HTMX-style interactions as native HTML attributes. It compiles `get`, `post`, `target`, `swap`, `trigger`, `vals`, `headers` attributes to `hx-*` attributes on the server. The browser never sees HSX attributes—only standard HTML with HTMX.

## Commands

```bash
# Run tests
deno task test               # Run all unit tests

# Type check
deno task check              # Type check all packages

# Run examples
deno task example:todos      # Todos example on port 8000
deno task example:hsx-components  # HSX Components example

# Run any server file directly
deno run --allow-net --allow-read examples/todos/server.tsx
```

## Architecture

HSX is a monorepo with four packages:

**Packages:**
- `@srdjan/hsx` (packages/hsx/) - Core JSX renderer, `render()`, `renderHtml()`, `renderSSE()`, `route()`, `id()`, `Fragment`, `hsxComponent()`, `hsxPage()`, `Loading`
- `@srdjan/hsx-styles` (packages/hsx-styles/) - `hsxStyles`, `hsxStylesDark`, `HSX_STYLES_PATH`
- `@srdjan/hsx-widgets` (packages/hsx-widgets/) - Widget protocol, `widgetToHsxComponent()`, `collectWidgetStyles()`, Declarative Shadow DOM SSR, `GenUIWidget`, `createCatalog()`, `formatForAI()`
- `@srdjan/hsx-genui` (packages/hsx-genui/) - Generative UI server: `createGenUIHandler()`, `createGenUIRoutes()`, `AIProvider` port, Claude adapter

**JSX Transform Pipeline (packages/hsx/):**
1. `jsx-runtime.ts` - Minimal JSX runtime producing VNode tree
2. `render.ts` - Walks VNode tree, normalizes HSX props per element type, auto-injects HTMX script before `</body>` when needed
3. `hsx-normalize.ts` - Maps HSX attributes → `hx-*` attributes, tracks HTMX usage via RenderContext

**Type System:**
- `hsx-types.ts` - `Route<Path, Params>` for type-safe URLs, `Id<Name>` branded `#name` strings, `HsxSwap`/`HsxTrigger` unions
- `jsx-runtime.ts` - Contains `JSX.IntrinsicElements` definitions for `form`, `button`, `a`, `div` with HSX attributes

**Rule:** Manual `hx-*` attributes are not allowed; render throws if they are present. Always use HSX aliases (`get/post/put/patch/delete`, `target`, `swap`, `trigger`, `vals`, `headers`, `behavior="boost"`).

**Render options:** `render` / `renderHtml` accept `injectHtmx?: boolean` to force or suppress the injected HTMX script; default is auto based on HSX usage. Also accepts `onElement?: (tag, props, ancestors) => void` callback for per-element validation during rendering (used by `hsxPage` to validate without double-rendering components).

**Styling:** Style objects are supported; they render to inline CSS (`backgroundColor` → `background-color`).

**Safety:** `script`/`style` children are emitted verbatim (no escaping); never pass user input there.

**HSX Widgets Shadow DOM:** Widgets with `shadow: "open"` or `shadow: "closed"` render via Declarative Shadow DOM (`<template shadowrootmode="...">`). The wrapper becomes the custom element tag instead of `<div>`, and styles always go inside the shadow root (hoistStyles is ignored).

**Imports (Workspace-aware):**
```ts
import { render, renderSSE, id, route, Fragment, hsxComponent, hsxPage } from "@srdjan/hsx";
import { hsxStyles, hsxStylesDark, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import { createCatalog, type GenUIWidget } from "@srdjan/hsx-widgets";
import { createGenUIHandler, createGenUIRoutes, createConversationStore } from "@srdjan/hsx-genui";
import { claudeProvider } from "@srdjan/hsx-genui/claude";
```

**Tree-shaking entry points:**
- `@srdjan/hsx/core` - render, renderSSE, escapeHtml, route, id, Fragment (smaller bundle)
- `@srdjan/hsx/components` - hsxComponent, hsxPage only

**GenUI (packages/hsx-genui/):**

Generative UI support - AI models select pre-registered widgets to render via tool calling, streamed to the browser via SSE + HTMX.

- `provider.ts` - `AIProvider` port interface with `Message`, `ToolCall`, `StreamEvent` types
- `providers/claude.ts` - Concrete Claude adapter using raw fetch + SSE (no SDK dependency)
- `handler.ts` - `createGenUIHandler()` orchestrates the AI conversation loop with multi-turn tool calls
- `conversation.ts` - Append-only `Conversation` type and in-memory `ConversationStore` with LRU eviction (maxSize, TTL)
- `components.tsx` - `createGenUIRoutes()` provides pre-built chat page, send, and stream routes

**GenUI Widget Catalog (packages/hsx-widgets/):**

- `genui-widget.ts` - `GenUIWidget<P>` extends `Widget<P>` with AI metadata (description, JSON schema, examples, category)
- `catalog.ts` - `createCatalog()` registers widgets, generates AI tool definitions, renders widgets from tool calls
- `raw-widget.ts` - Raw HTML escape hatch: validates, sanitizes via allowlist, renders in closed Shadow DOM
- `sanitize.ts` - Allowlist-based HTML sanitizer (strips disallowed tags, event handlers, dangerous URI schemes)
- `design-guidelines.ts` - `createDesignGuidelines()` and `formatForAI()` for AI system prompts
- `widget-wrapper.ts` - Shared wrapping logic for SSR and catalog rendering (Light DOM or Shadow DOM)

## Key Patterns

HSX offers two API styles. **Do not mix them** - choose one per project.

### hsxComponent Style (Recommended)

Co-locates route, handler, and render. The component itself is the route:
```ts
const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"],
  handler(req) { return { todos: [...] }; },
  render: ({ todos }) => <ul>...</ul>,
});

<form post={TodoList}>...</form>  // → hx-post="/todos"
```

### Low-Level API Style

Manual `route()` definitions, separate handlers. For simple cases or learning:
```ts
const routes = { todos: route("/todos", () => "/todos") };
<form post={routes.todos}>...</form>  // → hx-post="/todos"
```

### Shared Patterns

**Branded IDs** - Create with `id()`, use in `target`:
```ts
const ids = { list: id("todo-list") };  // Type: Id<"todo-list"> = "#todo-list"
<button get={...} target={ids.list}>    // → hx-target="#todo-list"
```

**HSX attributes on elements:**
- `get`, `post`, `put`, `patch`, `delete` → `hx-get`, etc.
- `target`, `swap`, `trigger`, `vals`, `headers` → `hx-target`, etc.
- `<a behavior="boost">` → `hx-boost="true"`

**HTMX script injection** - Automatic when any HSX attribute is used; served from `/static/htmx.js` (you must serve vendored HTMX).

## JSX Configuration

Files using JSX rely on root `deno.json` compilerOptions (already configured):
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx"
  }
}
```

The workspace `imports` map resolves `hsx/jsx-runtime` to `packages/hsx/jsx-runtime.ts`.
