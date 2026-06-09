# HSX User Guide

A comprehensive guide to using HSX, the SSR-only JSX renderer for HTMX
applications.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [HSX Attributes Reference](#hsx-attributes-reference)
4. [Type-Safe Routes](#type-safe-routes)
5. [HSX Components](#hsx-components)
6. [HSX Page](#hsx-page)
7. [Low-Level API](#low-level-api)
8. [Branded IDs](#branded-ids)
9. [HTMX Script Injection](#htmx-script-injection)
10. [Render Options](#render-options)
11. [HSX Widgets](#hsx-widgets)
12. [Generative UI](#generative-ui)
13. [Agent-Operable Apps](#agent-operable-apps)
14. [MCP Server](#mcp-server)
15. [HSX Lens](#hsx-lens)
16. [Best Practices](#best-practices)
17. [Examples Index](#examples-index)
18. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is HSX?

HSX is a server-side rendering (SSR) library for Deno that lets you write JSX
with HTMX-style attributes. Instead of writing `hx-get`, `hx-post`, `hx-target`,
etc., you write `get`, `post`, `target` as if they were native HTML attributes.

During rendering, HSX:

1. Walks your JSX tree
2. Converts HSX attributes to `hx-*` attributes
3. Automatically injects the HTMX script when needed
4. Returns plain HTML

### Why HSX?

- **Cleaner syntax** - `get="/todos"` instead of `hx-get="/todos"`
- **Type safety** - Routes and IDs are type-checked at compile time
- **Auto injection** - HTMX script is added only when needed
- **SSR-only** - No client runtime, just HTML

### The SSR-Only Philosophy

HSX has no client-side runtime. The browser never sees HSX attributes like
`get`, `post`, or `target`. These exist only in your TypeScript/JSX code. After
rendering, the browser receives:

- Standard HTML tags
- `hx-*` attributes (interpreted by HTMX)
- The HTMX script tag

---

## Getting Started

### Installation

**From JSR:**

```bash
deno add jsr:@srdjan/hsx
```

**Or import directly:**

```ts
import { id, render, route } from "jsr:@srdjan/hsx";
```

### Selective Imports (Tree-Shaking)

HSX supports modular imports for smaller bundles:

```ts
// Core only - rendering + type-safe routes (smaller bundle)
import { Fragment, id, render, route } from "jsr:@srdjan/hsx/core";

// Components only - higher-level abstractions
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx/components";

// Everything (default)
import { hsxComponent, hsxPage, render, route } from "jsr:@srdjan/hsx";
```

Use `/core` when you only need the low-level API without
`hsxComponent`/`hsxPage`.

### JSX Configuration

Add to your `deno.json`:

```jsonc
{
  "imports": {
    "hsx/jsx-runtime": "jsr:@srdjan/hsx/jsx-runtime"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx",
    "lib": ["dom", "dom.iterable", "deno.ns"],
    "strict": true
  }
}
```

Or use the pragma in individual files:

```tsx
/** @jsxImportSource jsr:@srdjan/hsx */
```

### Serving HTMX

HSX injects `<script src="/static/htmx.js">` when HTMX is used. You must serve
this file:

```ts
const handler = async (req: Request) => {
  const url = new URL(req.url);

  // Serve HTMX
  if (url.pathname === "/static/htmx.js") {
    const js = await Deno.readTextFile("./vendor/htmx/htmx.js");
    return new Response(js, {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }

  // Your routes...
  return render(<Page />);
};

Deno.serve(handler);
```

### Minimal Example

```tsx
/** @jsxImportSource jsr:@srdjan/hsx */
import { id, render, route } from "jsr:@srdjan/hsx";

const routes = {
  greet: route("/greet", () => "/greet"),
};

const ids = {
  message: id("message"),
};

function Page() {
  return (
    <html>
      <body>
        <button get={routes.greet} target={ids.message} swap="innerHTML">
          Say Hello
        </button>
        <div id="message">Click the button</div>
      </body>
    </html>
  );
}

Deno.serve(() => render(<Page />));
```

---

## HSX Attributes Reference

### HTTP Verb Attributes

These trigger HTMX requests:

| Attribute | Renders To  | Description                        |
| --------- | ----------- | ---------------------------------- |
| `get`     | `hx-get`    | GET request to fetch content       |
| `post`    | `hx-post`   | POST request to submit data        |
| `put`     | `hx-put`    | PUT request for full updates       |
| `patch`   | `hx-patch`  | PATCH request for partial updates  |
| `delete`  | `hx-delete` | DELETE request to remove resources |

**Example:**

```tsx
<button get="/data">Load</button>
// Renders: <button hx-get="/data">Load</button>

<form post="/submit">...</form>
// Renders: <form hx-post="/submit">...</form>
```

### Targeting Attributes

Control where content goes:

| Attribute | Renders To  | Description                     |
| --------- | ----------- | ------------------------------- |
| `target`  | `hx-target` | CSS selector for target element |
| `swap`    | `hx-swap`   | How to swap content into target |

**Swap values:**

- `innerHTML` - Replace inner HTML (default)
- `outerHTML` - Replace entire element
- `beforebegin` - Insert before element
- `afterbegin` - Insert as first child
- `beforeend` - Insert as last child
- `afterend` - Insert after element
- `none` - No swap, just trigger events

**Example:**

```tsx
<button get="/items" target="#list" swap="innerHTML">
  Refresh List
</button>;
// Renders: <button hx-get="/items" hx-target="#list" hx-swap="innerHTML">
```

### Event Attributes

Control when requests fire:

| Attribute | Renders To   | Description                     |
| --------- | ------------ | ------------------------------- |
| `trigger` | `hx-trigger` | Event that triggers the request |

**Common trigger values:**

- `click` - On mouse click (default for buttons)
- `change` - On input value change
- `submit` - On form submission
- `load` - On page load
- `revealed` - When element enters viewport
- `every Ns` - Polling interval (e.g., `every 5s`)

**Example:**

```tsx
<div get="/status" trigger="every 10s" target="#status">
  Loading...
</div>
// Renders: <div hx-get="/status" hx-trigger="every 10s" hx-target="#status">

<input get="/search" trigger="keyup changed delay:300ms" target="#results" />
```

### Data Attributes

Send additional data with requests:

| Attribute | Renders To   | Description                    |
| --------- | ------------ | ------------------------------ |
| `vals`    | `hx-vals`    | Additional values as JSON      |
| `headers` | `hx-headers` | Custom request headers as JSON |

**Example:**

```tsx
<button
  get="/filter"
  vals={{ status: "active", page: 1 }}
  headers={{ "X-Custom": "value" }}
>
  Filter
</button>;
// Renders:
// <button hx-get="/filter"
//         hx-vals='{"status":"active","page":1}'
//         hx-headers='{"X-Custom":"value"}'>
```

### Anchor-Specific Attributes

| Attribute          | Renders To        | Description                  |
| ------------------ | ----------------- | ---------------------------- |
| `behavior="boost"` | `hx-boost="true"` | Enable HTMX boost on anchors |

**Example:**

```tsx
<a href="/page" behavior="boost">Link</a>;
// Renders: <a href="/page" hx-boost="true">Link</a>
```

### Supported Elements

HSX attributes work on these elements:

- `form` - Forms with GET/POST
- `button` - Buttons for actions
- `a` - Links with boost
- `div`, `span` - Generic containers
- `section`, `article` - Semantic containers
- `ul`, `tbody`, `tr` - List and table elements

---

## Type-Safe Routes

### Creating Routes

Use `route()` to create type-safe routes:

```ts
import { route } from "jsr:@srdjan/hsx";

const routes = {
  home: route("/", () => "/"),
  users: {
    list: route("/users", () => "/users"),
    detail: route("/users/:id", (p) => `/users/${p.id}`),
  },
};
```

### Path Parameters

Parameters in the path (`:param`) are automatically extracted:

```ts
// Single parameter
const userRoute = route("/users/:id", (p) => `/users/${p.id}`);
// p is typed as { id: string | number }

// Multiple parameters
const postRoute = route(
  "/users/:userId/posts/:postId",
  (p) => `/users/${p.userId}/posts/${p.postId}`,
);
// p is typed as { userId: string | number; postId: string | number }

// No parameters
const homeRoute = route("/", () => "/");
// Build function takes no parameters
```

### Using Routes in JSX

Pass routes directly to HSX attributes:

```tsx
<button get={routes.users.list}>Load Users</button>
// Renders: <button hx-get="/users">Load Users</button>

<button get={routes.users.detail} params={{ id: 42 }}>View User</button>
// Renders: <button hx-get="/users/42">View User</button>
```

### Route Organization

Organize routes in a separate file:

```ts
// routes.ts
import { route } from "jsr:@srdjan/hsx";

export const routes = {
  todos: {
    list: route("/todos", () => "/todos"),
    toggle: route("/todos/:id/toggle", (p) => `/todos/${p.id}/toggle`),
    delete: route("/todos/:id", (p) => `/todos/${p.id}`),
  },
  api: {
    search: route("/api/search", () => "/api/search"),
  },
};
```

## HSX Components

`hsxComponent()` co-locates a route, request handler, and render function. The
handler's return type and the render props are tied together, so TypeScript
prevents mismatches.

### Defining a Component

```ts
import { hsxComponent } from "jsr:@srdjan/hsx";

export const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"], // defaults to ["GET"]

  async handler(req) {
    if (req.method === "POST") {
      const form = await req.formData();
      await addTodo(String(form.get("text")));
    }
    return { todos: await getTodos() }; // must match render props
  },

  render({ todos }) {
    return (
      <ul id="todo-list">
        {todos.map((t) => <li key={t.id}>{t.text}</li>)}
      </ul>
    );
  },
});
```

### Using in JSX and on the Server

- In JSX: `<form post={TodoList} target="#todo-list" swap="outerHTML" />`
- As a route matcher: `TodoList.match(pathname)` returns params or `null`
- As a handler: `return TodoList.handle(req)` renders the fragment (or full
  page)

### Full Page vs Fragment

Set `fullPage: true` when your render function outputs a complete HTML document.
The default (`fullPage: false`) returns just the rendered fragment with
`content-type: text/html; charset=utf-8`.

`methods` controls which HTTP verbs the component responds to; it defaults to
`GET`.

Unexpected handler or render errors return a generic `500` response. Throw
`HsxHttpError` from a handler for intentional HTTP failures such as invalid
input.

A component that declares both `describe` and `input` also becomes an AI tool:
the `@srdjan/hsx-agent` package exposes it to an agent that drives the same
`handle()` the browser hits, from the one definition that serves humans.
Components without both fields stay invisible to the agent. The same declaration
feeds `@srdjan/hsx-mcp` too: `createMcpHandler()` mounts an MCP endpoint so
external clients such as Claude Code can call the components from outside the
app. See [Agent-Operable Apps](#agent-operable-apps) and
[MCP Server](#mcp-server).

---

## HSX Page

`hsxPage()` wraps a render function that returns a **full HTML document** and
validates it for semantic cleanliness:

- Root must be `<html>` containing `<head>` followed by `<body>`
- Semantic tags (`header`, `main`, `section`, `article`, `footer`, headings,
  lists, etc.) may **not** have `class` or inline `style`
- `<style>` tags must live inside `<head>` (put your CSS there)
- Composition is limited to semantic HTML, standard document tags, and HSX
  components

```tsx
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx";

const Stats = hsxComponent("/stats", {
  handler: () => ({ total: 42 }),
  render: ({ total }) => <p>Total: {total}</p>,
});

export const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <title>Guarded Layout</title>
      <style>{"body { font-family: system-ui; }"}</style>
    </head>
    <body>
      <header>
        <h1>Dashboard</h1>
      </header>
      <main>
        <section>
          <div data-surface="card">
            <Stats.Component />
          </div>
        </section>
      </main>
    </body>
  </html>
));

// Usage: render(<Page.Component />) or Page.render();
```

Violations throw descriptive errors (e.g., "Semantic element <section> cannot
have a class").

---

## Low-Level API

You can still use the underlying primitives without `hsxPage` or `hsxComponent`:

- `render()` to return a `Response` for a full document
- `renderHtml()` to return HTML fragments
- Manual `route()`/`id()` helpers and your own routing/matching

See `examples/low-level-api/` for a reference that uses direct
`render`/`renderHtml`, manual HSX attributes, and explicit route handling.

---

## Branded IDs

### Creating IDs

Use `id()` to create type-safe element references:

```ts
import { id } from "jsr:@srdjan/hsx";

const ids = {
  list: id("todo-list"), // Type: Id<"todo-list">
  count: id("item-count"), // Type: Id<"item-count">
  form: id("add-form"), // Type: Id<"add-form">
};

// The value is "#todo-list", "#item-count", etc.
```

### Using IDs

Use IDs in both the element and target:

```tsx
// Define the element
<ul id="todo-list">...</ul>

// Reference it in target
<button get="/todos" target={ids.list}>Refresh</button>
// Renders: <button hx-get="/todos" hx-target="#todo-list">
```

### Type Safety Benefits

The branded type ensures you can't accidentally use a plain string where an ID
is expected:

```ts
const ids = { list: id("todo-list") };

// This works:
<button target={ids.list}>...</button>

// This also works (string is allowed):
<button target="#other-element">...</button>

// The benefit: ids.list is typed as Id<"todo-list">,
// catching typos at compile time
```

### ID Organization

Organize IDs in a separate file:

```ts
// ids.ts
import { id } from "jsr:@srdjan/hsx";

export const ids = {
  app: id("app"),
  todoList: id("todo-list"),
  todoCount: id("todo-count"),
  filters: id("filters"),
};
```

---

## HTMX Script Injection

### Auto-Injection Behavior

HSX automatically injects the HTMX script when any HSX attribute is used:

```tsx
// This triggers injection:
<button get="/data">Load</button>;

// Rendered HTML includes:
// <script src="/static/htmx.js"></script>
```

The script is injected just before `</body>`.

### Manual Control

Force injection even without HSX attributes:

```tsx
render(<Page />, { injectHtmx: true });
```

Suppress injection when you bundle HTMX yourself:

```tsx
render(<Page />, { injectHtmx: false });
```

### Custom HTMX Path

The injection path is `/static/htmx.js`. If you need a different path, suppress
auto-injection and add the script manually:

```tsx
render(<Page />, { injectHtmx: false });

// In your JSX:
<script src="/my/custom/path/htmx.min.js"></script>;
```

---

## Render Options

### `render(node, options?)`

Returns an HTTP `Response`:

```ts
interface RenderOptions {
  status?: number; // HTTP status code (default: 200)
  headers?: HeadersInit; // Additional response headers
  maxDepth?: number; // Max nesting depth
  maxNodes?: number; // Max node count
  injectHtmx?: boolean; // Force/suppress HTMX injection
}

// Example:
render(<Page />, {
  status: 200,
  headers: { "X-Custom": "header" },
  maxDepth: 100,
  maxNodes: 50000,
});
```

### `renderHtml(node, options?)`

Returns an HTML string:

```ts
interface RenderHtmlOptions {
  maxDepth?: number;
  maxNodes?: number;
  injectHtmx?: boolean;
}

const html = renderHtml(<Page />, { maxDepth: 100 });
```

### DoS Protection

Use limits to prevent denial-of-service attacks:

```ts
// Prevent deeply nested structures (stack overflow)
render(<Page />, { maxDepth: 100 });

// Prevent extremely large trees (memory exhaustion)
render(<Page />, { maxNodes: 50000 });
```

Recommended production values:

- `maxDepth: 100` - Sufficient for any reasonable HTML
- `maxNodes: 50000` - Allows large pages without abuse

---

## HSX Widgets

The `@srdjan/hsx-widgets` package lets you define a widget once and use it in
two places: SSR (rendered through HSX routes) and embeddable iframe shells for
third-party pages.

### Installation

```bash
deno add jsr:@srdjan/hsx-widgets
```

### Defining a Widget

A widget is a typed record with validation, styles, a pure render function, and
optional data loading:

```tsx
import type { Widget } from "jsr:@srdjan/hsx-widgets";
import { fail, ok } from "jsr:@srdjan/hsx-widgets";

type GreetingProps = { readonly name: string; readonly message: string };

export const greetingWidget: Widget<GreetingProps> = {
  tag: "hsx-greeting",
  props: {
    validate(raw) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.name !== "string") {
        return fail({
          tag: "validation_error",
          message: "Name required",
          field: "name",
        });
      }
      return ok({ name: obj.name, message: String(obj.message ?? "") });
    },
  },
  styles: `.hsx-greeting { font-family: system-ui; padding: 1rem; }`,
  render: (props) => (
    <div class="hsx-greeting">
      <h2>{props.name}</h2>
      <p>{props.message}</p>
    </div>
  ),
  load: async (params) => {
    if (!params.name) {
      return fail({ tag: "load_error", message: "Missing name" });
    }
    return ok({ name: params.name, message: `Hello, ${params.name}!` });
  },
};
```

### SSR: Serving Through HSX Routes

Use `widgetToHsxComponent()` to bridge a widget into an HSX route. The adapter
handles props validation, data loading, scoped style injection, and error
responses:

```tsx
import { widgetToHsxComponent } from "jsr:@srdjan/hsx-widgets/ssr";

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
});

// In your server:
if (GreetingRoute.match(url.pathname)) return GreetingRoute.handle(req);
```

Invalid widget props return `400` from the SSR adapter, while loader and render
failures return generic `500` responses through `hsxComponent`.

### Embed: Iframe Shells for Third-Party Pages

Use `createEmbedHandler()` to serve `/embed/:tag` HTML shells:

```tsx
import { createEmbedHandler } from "jsr:@srdjan/hsx-widgets";

const widgets = new Map([["hsx-greeting", greetingWidget]]);
const embedHandler = createEmbedHandler(widgets, {
  basePath: "/embed",
  bundlePath: "/static/hsx",
});

const res = embedHandler(req);
if (res) return res;
```

On a host page, use the snippet loader:

```html
<div data-hsx-uri="https://yoursite.com/embed/hsx-greeting?name=World"></div>
<script src="https://yoursite.com/static/hsx/snippet.js"></script>
```

### Declarative Shadow DOM

Widgets can render inside a Declarative Shadow DOM for style isolation. Set
`shadow: "open"` or `shadow: "closed"` on the widget definition:

```tsx
const myWidget: Widget<MyProps> = {
  tag: "hsx-example",
  shadow: "open",
  // ...
};
```

The SSR adapter wraps content in `<template shadowrootmode="...">` inside the
custom element tag. Styles go inside the shadow root automatically.

### Style Hoisting for hsxPage

When using `hsxPage`, you can hoist widget styles into `<head>` instead of
inlining them in each widget wrapper:

```tsx
import { widgetToHsxComponent } from "jsr:@srdjan/hsx-widgets/ssr";
import { WidgetStyles } from "jsr:@srdjan/hsx-widgets/styles";

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
  hoistStyles: true,
});

// In your page <head>:
<WidgetStyles widgets={[greetingWidget]} />;
```

For the full widget guide including the build pipeline, see
[WIDGETS.md](WIDGETS.md).

---

## Generative UI

`@srdjan/hsx-genui` lets an AI model render UI in your app: the model picks from
a catalog of pre-registered widgets via tool calling, and each rendered widget
streams to the browser over SSE + HTMX. The model never writes raw HTML; it can
only invoke widgets you registered.

### Installation

```bash
deno add jsr:@srdjan/hsx-genui jsr:@srdjan/hsx-widgets
```

### Catalog: Widgets as AI Tools

Extend a widget with AI metadata to make it selectable. `GenUIWidget<P>` adds a
`description`, a JSON Schema for the props, optional few-shot `examples`, and a
`category`:

```tsx
import { createCatalog, type GenUIWidget } from "jsr:@srdjan/hsx-widgets";

const weatherWidget: GenUIWidget<WeatherProps> = {
  ...baseWidget, // a regular Widget<WeatherProps>
  description: "Show current weather for a city.",
  schema: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  },
  category: "display",
};

const catalog = createCatalog([weatherWidget]);
```

The catalog derives one AI tool definition per widget (`catalog.toTools()`) and
renders tool calls back to HTML (`catalog.render(tag, props)`), running the
widget's own `validate()` on the model-supplied props.

### The Handler

`createGenUIHandler()` runs the conversation loop: it sends history plus the
tool definitions to the provider, renders each tool call through the catalog,
streams text and widget HTML as SSE frames, and reports render results back to
the model for follow-up turns.

```tsx
import { createGenUIHandler } from "jsr:@srdjan/hsx-genui";
import { claudeProvider } from "jsr:@srdjan/hsx-genui/claude";

const handler = createGenUIHandler({
  catalog,
  provider: claudeProvider({ model: "claude-sonnet-4-6" }),
});
```

| Option              | Default  | Description                                   |
| ------------------- | -------- | --------------------------------------------- |
| `catalog`           | required | The widget catalog                            |
| `provider`          | required | An `AIProvider` (see below)                   |
| `systemPrompt`      | none     | Extra system prompt, prepended                |
| `includeGuidelines` | `true`   | Append design guidelines to the system prompt |
| `maxTurns`          | `10`     | Maximum tool-calling turns per message        |

### Providers

`AIProvider` is a one-method port: `stream(messages, tools)` returns an async
iterable of `text`, `tool_call`, and `done` events. The built-in
`claudeProvider()` implements it with raw `fetch` against the Anthropic API, no
SDK. It reads `ANTHROPIC_API_KEY` from the environment unless you pass `apiKey`;
`model` defaults to `claude-sonnet-4-6` and `maxTokens` to `4096`. Implement the
same interface to plug in another model.

### Pre-Built Chat Routes

`createGenUIRoutes()` wires the HTMX + SSE plumbing for a chat interface:

```tsx
import {
  createConversationStore,
  createGenUIRoutes,
} from "jsr:@srdjan/hsx-genui";

const store = createConversationStore();
const { page, send, stream } = createGenUIRoutes({
  handler,
  store,
  basePath: "/genui",
});

// In your server:
if (page.match(url.pathname)) return page.handle(req);
if (send.match(url.pathname)) return send.handle(req);
if (stream.match(url.pathname)) return stream.handle(req);
```

`page` (GET `/genui`) renders the chat shell, `send` (POST `/genui/send`)
accepts user input and renders the user bubble plus an SSE-connected div, and
`stream` (GET `/genui/stream/:id`) returns the AI's SSE response. The
conversation store is in-memory only; entries evict past 1000 conversations
(LRU) or after 30 minutes idle, configurable via `maxSize` and `ttlMs`.

---

## Agent-Operable Apps

Where GenUI renders inert display widgets, `@srdjan/hsx-agent` lets an AI drive
your application's real endpoints. A component that declares both `describe` and
`input` carries a `.agent` descriptor; `createAppAgent()` turns those
descriptors into AI tools, and each tool call runs the component's own
`handle()` - the same code path a human's HTMX request takes.

### Installation

```bash
deno add jsr:@srdjan/hsx-agent jsr:@srdjan/hsx-genui
```

The agent reuses the `AIProvider` port and chat routes from `hsx-genui`.

### Declaring Agent-Callable Components

```tsx
const AddTodo = hsxComponent("/todos", {
  methods: ["POST"],
  describe: "Add a new todo item to the list.",
  input: {
    schema: {
      type: "object",
      properties: { text: { type: "string", description: "The todo text." } },
      required: ["text"],
    },
  },
  async handler(req) {
    const form = await req.formData();
    addTodo(String(form.get("text")));
    return {};
  },
  render: () => <TodoListView />,
});
```

The schema must be a JSON Schema object (`"type": "object"`). An optional
`input.assert` function validates tool arguments before the request is built; a
throw becomes the tool error the model sees. Components without both fields stay
invisible to the agent - exposure is opt-in by declaration.

Tool names derive from the method and path (`POST /todos` becomes `post_todos`);
set `agentName` to override.

### Running the Agent

```tsx
import { createAppAgent } from "jsr:@srdjan/hsx-agent";
import { claudeProvider } from "jsr:@srdjan/hsx-genui/claude";

const agent = createAppAgent({
  components: [AddTodo, ToggleTodo, ClearDone],
  provider: claudeProvider(),
});
```

For each tool call the agent synthesizes a `Request` from the tool arguments
(path parameters go in the URL, the rest become a urlencoded body so
`req.formData()` works), runs the component, streams the rendered HTML to the
browser, and reports `HTTP <status>` plus the same HTML back to the model as its
observation.

Options: `origin` (base for synthesized requests, default `http://localhost`),
`systemPrompt`, `maxTurns` (default `10`), and `observationCap` (max HTML
characters per observation, default `4096`).

`AppAgent` is structurally a `GenUIHandler`, so it drops into
`createGenUIRoutes()` unchanged. The `todos-copilot` example serves the agent
through the same chat routes and renders the list with `swapOob`, so the
canonical `#todo-list` updates whether the change came from the human form or
the agent.

For custom loops, `componentsToTools(components)` and
`toRequest(component, args, origin)` expose the two building blocks directly.

---

## MCP Server

`@srdjan/hsx-mcp` serves the same agent-callable components to clients outside
your app. `createMcpHandler()` mounts a Model Context Protocol endpoint into
your existing `Deno.serve`, so MCP clients such as Claude Code or Claude Desktop
discover the components as tools and drive them remotely. No chat UI, no API key
on the server: the connecting client brings its own model.

### Installation

```bash
deno add jsr:@srdjan/hsx-mcp
```

### Mounting the Endpoint

```tsx
import { createMcpHandler } from "jsr:@srdjan/hsx-mcp";

const mcp = createMcpHandler({
  components: todoComponents,
  serverName: "todos",
});

Deno.serve((req) => {
  const mcpResponse = mcp.handle(req);
  if (mcpResponse) return mcpResponse;

  // Your app routes...
  return new Response("Not found", { status: 404 });
});
```

`handle()` returns `null` for requests outside `basePath` (default `/mcp`), the
same mount contract as HSX Lens. Connect from Claude Code:

```bash
claude mcp add --transport http todos http://localhost:8000/mcp
```

Tool results carry `HTTP <status>` plus the component's rendered HTML, capped at
`observationCap` characters, so the connecting agent observes the same
hypermedia a human sees.

### Authorization

MCP tools mutate real application state. The endpoint ships with two opt-in
guards; use one before exposing it beyond localhost:

```tsx
// Require Authorization: Bearer <token> (constant-time compare):
const mcp = createMcpHandler({
  components: todoComponents,
  bearerToken: Deno.env.get("MCP_TOKEN"),
});

// Or a custom check, sync or async:
const mcp = createMcpHandler({
  components: todoComponents,
  authorize: (req) => checkSession(req),
});
```

`bearerToken` and `authorize` are mutually exclusive. Browser requests with a
cross-origin `Origin` header are rejected unless listed in `allowedOrigins`;
requests without an `Origin` header (MCP CLIs) pass.

### Manifest Resource

Pass a lens manifest to expose the app's hypermedia contract as an MCP resource:

```tsx
import { createHsxManifest } from "jsr:@srdjan/hsx-lens";

const mcp = createMcpHandler({
  components: todoComponents,
  manifest: createHsxManifest({
    appName: "Todos",
    pages: [{ name: "Home", path: "/", render: () => <Page.Component /> }],
    components: todoComponents,
  }),
});
```

Clients then read `hsx://manifest` (JSON) to see pages, components,
interactions, targets, and tools before calling anything.

### Protocol Notes

The endpoint speaks stateless MCP Streamable HTTP: a single POST endpoint, plain
JSON responses, no sessions, no SDK dependency. GET returns `405` because the
server never initiates messages. Supported protocol revisions: `2025-06-18` and
`2025-03-26`.

---

## HSX Lens

`@srdjan/hsx-lens` gives you a local development view of the hypermedia contract
your pages and components already declare. It renders page samples, records HSX
attributes before they are normalized to `hx-*`, mirrors component/widget/agent
metadata, and serves a workbench plus JSON manifest.

Install it separately:

```bash
deno add jsr:@srdjan/hsx-lens
```

Mount it explicitly in development:

```tsx
import { createHsxLens } from "jsr:@srdjan/hsx-lens";

const lens = createHsxLens({
  appName: "Todos",
  pages: [{ name: "Home", path: "/", render: () => <Page.Component /> }],
  components: todoComponents,
});

Deno.serve((req) => {
  const lensResponse = lens.handle(req);
  if (lensResponse) return lensResponse;

  // Your app routes...
  return new Response("Not found", { status: 404 });
});
```

Open `/__hsx` for the HTML workbench or `/__hsx/manifest.json` for the manifest.
Lens does not call component handlers; pass one page sample for each state you
want inspected.

---

## Best Practices

### Organize Routes and IDs

Keep routes and IDs in separate files:

```
src/
  routes.ts   # All route definitions
  ids.ts      # All ID definitions
  components/ # Your components
```

### Use Type-Safe Routes

Avoid hardcoding URLs:

```tsx
// Bad:
<button get="/users/123">View</button>

// Good:
<button get={routes.users.detail} params={{ id: 123 }}>View</button>
```

### Partial Updates

Design endpoints to return HTML fragments:

```tsx
// Full page endpoint
app.get("/", () => render(<FullPage />));

// Partial update endpoint
app.get("/todos", () => renderHtml(<TodoList todos={todos} />));
```

### Security Guidelines

1. **Never pass user input to script/style tags:**
   ```tsx
   // DANGEROUS:
   <script>{userInput}</script>

   // Safe - these are escaped:
   <div>{userInput}</div>
   ```

2. **Validate all route parameters:**
   ```ts
   const id = parseInt(params.id);
   if (isNaN(id)) return new Response("Invalid ID", { status: 400 });
   ```

3. **Use DoS protection in production:**
   ```ts
   render(<Page />, { maxDepth: 100, maxNodes: 50000 });
   ```

### Performance Tips

1. **Keep components simple** - HSX is SSR-only, so every request renders fresh
2. **Use partial updates** - Return only the HTML that changed
3. **Leverage HTMX triggers** - Use `delay:` and `throttle:` modifiers

### Styling with `@srdjan/hsx-styles` (optional)

- Serve `hsxStyles` and add `<link rel="stylesheet" href={HSX_STYLES_PATH}>` in
  your page `<head>`.
- Use Auras-style layout attributes such as
  `data-layout="stack|cluster|grid|container"`, plus `data-gap`, `data-align`,
  and `data-grid-min`.
- Use `data-surface="card"` for ready-made panels and
  `data-variant="solid|soft|ghost"` for buttons.
- Customize via Auras tokens like `--primary`, `--bg`, `--surface`, `--border`,
  `--text`, `--text-muted`, `--font-display`, and the `--text-*` scale.
- Force dark mode with `data-theme="dark"` on `<html>` when needed.

---

## Examples Index

| Example         | Command                             | File                                  |
| --------------- | ----------------------------------- | ------------------------------------- |
| Todos           | `deno task example:todos`           | `examples/todos/server.tsx`           |
| Active Search   | `deno task example:active-search`   | `examples/active-search/server.tsx`   |
| Lazy Loading    | `deno task example:lazy-loading`    | `examples/lazy-loading/server.tsx`    |
| Form Validation | `deno task example:form-validation` | `examples/form-validation/server.tsx` |
| Polling         | `deno task example:polling`         | `examples/polling/server.tsx`         |
| Auras Showcase  | `deno task example:auras-showcase`  | `examples/auras-showcase/server.tsx`  |
| Tabs & Modal    | `deno task example:tabs-modal`      | `examples/tabs-modal/server.tsx`      |
| HSX Components  | `deno task example:hsx-components`  | `examples/hsx-components/server.tsx`  |
| HSX Page        | `deno task example:hsx-page`        | `examples/hsx-page/server.tsx`        |
| Low-Level API   | `deno task example:low-level-api`   | `examples/low-level-api/server.tsx`   |
| HSX Widget      | `deno task example:hsx-widget`      | `examples/hsx-widget/server.tsx`      |
| ATS             | `deno task example:ats`             | `examples/ats/server.tsx`             |
| Event Bus       | `deno task example:event-bus`       | `examples/event-bus/server.tsx`       |
| Todos Copilot   | `deno task example:todos-copilot`   | `examples/todos-copilot/server.tsx`   |

For the HSX Widgets demo, build assets once before starting the server:

```bash
deno task build:hsx-widgets
deno task example:hsx-widget
```

More detail: `examples/README.md` and `docs/WIDGETS.md`.

## Troubleshooting

### Common Errors

__"Manual hx-_ attributes are not allowed"_*

HSX throws if you use `hx-*` attributes directly:

```tsx
// Error:
<button hx-get="/data">Load</button>

// Fix - use HSX attribute:
<button get="/data">Load</button>
```

**"Maximum render depth exceeded"**

You have infinite recursion or very deep nesting:

```tsx
// Check for infinite loops:
function Bad() {
  return <Bad />; // Infinite recursion!
}

// Or increase the limit if legitimately needed:
render(<Page />, { maxDepth: 200 });
```

**"Maximum node count exceeded"**

You're rendering too many elements:

```tsx
// Check for accidental large arrays
// Or increase the limit:
render(<Page />, { maxNodes: 100000 });
```

**HTMX not working**

1. Check that you're serving `/static/htmx.js`
2. Verify the HTMX file exists at `./vendor/htmx/htmx.js`
3. Check browser console for 404 errors

### TypeScript Errors

**"Property 'get' does not exist on type..."**

Ensure your deno.json has the correct JSX configuration:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx"
  }
}
```

**Route parameter type mismatch**

Ensure your params match the path:

```ts
// Path has :id
const route = route("/users/:id", (p) => `/users/${p.id}`);

// Params must include id
<button get={route} params={{ id: 123 }}>View</button>;
```

### Debug Tips

1. **Check rendered HTML** - Use `renderHtml()` and log the output
2. **Verify HTMX loading** - Check Network tab in browser DevTools
3. **Test endpoints directly** - Curl your endpoints to see raw HTML
4. **Enable HTMX logging** - Add `htmx.logAll()` in browser console
