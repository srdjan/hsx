# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What is HSX?

HSX is an SSR-only JSX/TSX renderer for Deno that treats HTMX-style interactions
as native HTML attributes. It compiles `get`, `post`, `target`, `swap`,
`trigger`, `vals`, `headers` attributes to `hx-*` attributes on the server. The
browser never sees HSX attributes—only standard HTML with HTMX.

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

HSX is a monorepo with five packages:

**Packages:**

- `@srdjan/hsx` (packages/hsx/) - Core JSX renderer, `render()`, `renderHtml()`,
  `renderSSE()`, `route()`, `id()`, `Fragment`, `hsxComponent()`, `hsxPage()`,
  `Loading`
- `@srdjan/hsx-styles` (packages/hsx-styles/) - `hsxStyles`, `HSX_STYLES_PATH`
  (Auras Elements + HSX brand layer)
- `@srdjan/hsx-widgets` (packages/hsx-widgets/) - Widget protocol,
  `widgetToHsxComponent()`, `collectWidgetStyles()`, Declarative Shadow DOM SSR,
  `GenUIWidget`, `createCatalog()`, `formatForAI()`
- `@srdjan/hsx-genui` (packages/hsx-genui/) - Generative UI server:
  `createGenUIHandler()`, `createGenUIRoutes()`, `AIProvider` port, Claude
  adapter
- `@srdjan/hsx-agent` (packages/hsx-agent/) - Agent-operable apps:
  `createAppAgent()`, `componentsToTools()`, `toRequest()`. Turns
  agent-callable `hsxComponent`s into AI tools that drive the app's real
  endpoints, reusing the genui provider/SSE plumbing

**JSX Transform Pipeline (packages/hsx/):**

1. `jsx-runtime.ts` - Minimal JSX runtime producing VNode tree
2. `render.ts` - Walks VNode tree, normalizes HSX props per element type,
   auto-injects HTMX script before `</body>` when needed
3. `hsx-normalize.ts` - Maps HSX attributes → `hx-*` attributes, tracks HTMX
   usage via RenderContext

**Type System:**

- `hsx-types.ts` - `Route<Path, Params>` for type-safe URLs, `Id<Name>` branded
  `#name` strings, `HsxSwap`/`HsxTrigger` unions
- `jsx-runtime.ts` - Contains `JSX.IntrinsicElements` definitions for `form`,
  `button`, `a`, `div` with HSX attributes

**Rule:** Manual `hx-*` attributes are not allowed; render throws if they are
present. Always use HSX aliases (`get/post/put/patch/delete`, `target`, `swap`,
`trigger`, `vals`, `headers`, `behavior="boost"`).

**Render options:** `render` / `renderHtml` accept `injectHtmx?: boolean` to
force or suppress the injected HTMX script; default is auto based on HSX usage.
Also accepts `onElement?: (tag, props, ancestors) => void` callback for
per-element validation during rendering (used by `hsxPage` to validate without
double-rendering components).

**Styling:** Style objects are supported; they render to inline CSS
(`backgroundColor` → `background-color`).

**Safety:** `script`/`style` children are emitted verbatim (no escaping); never
pass user input there.

**HSX Widgets Shadow DOM:** Widgets with `shadow: "open"` or `shadow: "closed"`
render via Declarative Shadow DOM (`<template shadowrootmode="...">`). The
wrapper becomes the custom element tag instead of `<div>`, and styles always go
inside the shadow root (hoistStyles is ignored).

**Imports (Workspace-aware):**

```ts
import {
  Fragment,
  hsxComponent,
  hsxPage,
  id,
  render,
  renderSSE,
  route,
} from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";
import { createCatalog, type GenUIWidget } from "@srdjan/hsx-widgets";
import {
  createConversationStore,
  createGenUIHandler,
  createGenUIRoutes,
} from "@srdjan/hsx-genui";
import { claudeProvider } from "@srdjan/hsx-genui/claude";
import { createAppAgent } from "@srdjan/hsx-agent";
```

**Tree-shaking entry points:**

- `@srdjan/hsx/core` - render, renderSSE, escapeHtml, route, id, Fragment
  (smaller bundle)
- `@srdjan/hsx/components` - hsxComponent, hsxPage only

**GenUI (packages/hsx-genui/):**

Generative UI support - AI models select pre-registered widgets to render via
tool calling, streamed to the browser via SSE + HTMX.

- `provider.ts` - `AIProvider` port interface with `Message`, `ToolCall`,
  `StreamEvent` types
- `providers/claude.ts` - Concrete Claude adapter using raw fetch + SSE (no SDK
  dependency)
- `handler.ts` - `createGenUIHandler()` orchestrates the AI conversation loop
  with multi-turn tool calls
- `conversation.ts` - Append-only `Conversation` type and in-memory
  `ConversationStore` with LRU eviction (maxSize, TTL)
- `components.tsx` - `createGenUIRoutes()` provides pre-built chat page, send,
  and stream routes

**GenUI Widget Catalog (packages/hsx-widgets/):**

- `genui-widget.ts` - `GenUIWidget<P>` extends `Widget<P>` with AI metadata
  (description, JSON schema, examples, category)
- `catalog.ts` - `createCatalog()` registers widgets, generates AI tool
  definitions, renders widgets from tool calls
- `raw-widget.ts` - Raw HTML escape hatch: validates, sanitizes via allowlist,
  renders in closed Shadow DOM
- `sanitize.ts` - Allowlist-based HTML sanitizer (strips disallowed tags, event
  handlers, dangerous URI schemes)
- `design-guidelines.ts` - `createDesignGuidelines()` and `formatForAI()` for AI
  system prompts
- `widget-wrapper.ts` - Shared wrapping logic for SSR and catalog rendering
  (Light DOM or Shadow DOM)

**Agent-Operable Apps (packages/hsx-agent/):**

Lets an AI drive the application's real `hsxComponent`s (not inert widgets). A
component is agent-callable only when it declares both `describe` and `input`
in its `hsxComponent` options; this produces a pure-metadata `.agent`
descriptor on the component (`{ name, description, schema, method, assert? }`).
Components without it are invisible to the agent (opt-in by declaration).

- `hsx-component.ts` (in `@srdjan/hsx`) - `describe`/`input`/`agentName`
  options and the derived `.agent` descriptor (`AgentDescriptor`,
  `AgentInputSchema`)
- `component-tools.ts` - `componentsToTools()` derives AI tool definitions from
  `.agent` descriptors (mirrors `widgetToToolDefinition`)
- `request-build.ts` - `toRequest()` splits tool-call args into path params vs
  body, synthesizes a `Request` that drives the component's own `handle()`
- `app-agent.ts` - `createAppAgent()` runs the multi-turn loop (a near-copy of
  `createGenUIHandler`); each tool call invokes the real component, streams the
  rendered HTML to the browser, and feeds it back to the model as its
  observation. `AppAgent` is structurally a `GenUIHandler`, so it drops into
  `createGenUIRoutes` directly
- `types.ts` - `AgentComponent`, the structural subset of `HsxComponent` the
  runner needs (no `any`; `build`/`handle` are bivariant method signatures)

The `examples/todos-copilot/` example wires this end to end: the same mutating
components serve the human form and the agent, and render the list with
`swapOob` so changes update the canonical `#todo-list` out-of-band from either
path. The MCP server adapter is a planned follow-on built on the same
`componentsToTools()` metadata.

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
<form post={routes.todos}>...</form>; // → hx-post="/todos"
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

**HTMX script injection** - Automatic when any HSX attribute is used; served
from `/static/htmx.js` (you must serve vendored HTMX).

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

The workspace `imports` map resolves `hsx/jsx-runtime` to
`packages/hsx/jsx-runtime.ts`.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with
project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial
tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes,
simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it
work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer
rewrites due to overcomplication, and clarifying questions come before
implementation rather than after mistakes.
