# HSX is love, HSX is life

First things, first... What the hack does HSX stand for? I'll say it's '**H**TML
for **S**erver-Side e**X**tensions'. :0

But, honestly, I prefer: **H**TMX **S**laps **X**tremely :)

SSR-only JSX/TSX renderer for Deno that hides HTMX-style attributes away during
the rendering process, and compiles them to `hx-*` attributes.

> Disclaimer: this was a quick hack in my free time, held together by vibe
> coding and espresso. I like it a lot, but consider it an early release. I feel
> it is getting better (a lot)

## TL;DR: Like JSX, but for SSR HTML + HTMX.

## Features

- **SSR-only** - No client runtime. Outputs plain HTML.
- **HTMX as HTML** - Write `get`, `post`, `target`, `swap` as native attributes
- **Type-safe routes** - Branded `Route<Path>` types with automatic parameter
  inference
- **Co-located components** - `hsxComponent()` bundles route + handler + render
- **Page guardrails** - `hsxPage()` enforces semantic, style-free layouts
- **Branded IDs** - `id("name")` returns `Id<"name">` typed as `"#name"`
- **Auto HTMX injection** - `<script src="/static/htmx.js">` injected when
  needed
- **No manual hx-\*** - Throws at render time if you write `hx-get` directly
- **Widgets** - Define once, serve via SSR or embed as iframes with Declarative
  Shadow DOM
- **Generative UI** - AI models select and render widgets via tool calling,
  streamed to the browser via SSE + HTMX
- **Agent-operable** - Any `hsxComponent` that declares `describe` + `input`
  becomes an AI tool; an agent drives your real endpoints from the same
  definition that serves humans
- **HSX Lens** - Opt-in dev workbench that maps page samples, components,
  widgets, targets, and agent tools into a hypermedia manifest

## Installation

### From JSR

```bash
deno add jsr:@srdjan/hsx
```

Or import directly:

```ts
import { id, render, route } from "jsr:@srdjan/hsx";
```

### Separate Packages

HSX is a monorepo with seven packages:

```ts
// Core - JSX rendering, type-safe routes, hsxComponent, hsxPage, SSE
import {
  Fragment,
  hsxComponent,
  hsxPage,
  id,
  render,
  renderSSE,
  route,
} from "jsr:@srdjan/hsx";

// Styles - ready-to-use CSS with theming support
import { HSX_STYLES_PATH, hsxStyles } from "jsr:@srdjan/hsx-styles";

// Widgets - embeddable widget protocol + SSR/embed adapters + GenUI catalog
import { widgetToHsxComponent } from "jsr:@srdjan/hsx-widgets/ssr";
import { createCatalog, type GenUIWidget } from "jsr:@srdjan/hsx-widgets";

// GenUI - AI-powered generative UI with tool calling
import {
  createConversationStore,
  createGenUIHandler,
  createGenUIRoutes,
} from "jsr:@srdjan/hsx-genui";
import { claudeProvider } from "jsr:@srdjan/hsx-genui/claude";

// Agent - make your app agent-operable (components become AI tools)
import { createAppAgent } from "jsr:@srdjan/hsx-agent";

// MCP - serve those components to external MCP clients (Claude Code, ...)
import { createMcpHandler } from "jsr:@srdjan/hsx-mcp";

// Lens - inspect the app's hypermedia contract during development
import { createHsxLens } from "jsr:@srdjan/hsx-lens";
```

Install individually:

```bash
deno add jsr:@srdjan/hsx
deno add jsr:@srdjan/hsx-styles
deno add jsr:@srdjan/hsx-widgets
deno add jsr:@srdjan/hsx-genui
deno add jsr:@srdjan/hsx-agent
deno add jsr:@srdjan/hsx-mcp
deno add jsr:@srdjan/hsx-lens
```

### Selective Imports (Tree-Shaking)

For smaller bundles, import only what you need:

```ts
// Core only - render, route, id, Fragment (smaller bundle)
import { Fragment, id, render, route } from "jsr:@srdjan/hsx/core";

// Components only - hsxComponent, hsxPage
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx/components";

// Everything (default)
import { hsxComponent, hsxPage, render, route } from "jsr:@srdjan/hsx";
```

### From Source

Clone and import using workspace package names:

```ts
import { hsxComponent, hsxPage, id, render, route } from "@srdjan/hsx";
```

## Quick Start (Low-Level API)

> **Note:** This shows the low-level API using `route()`. For most projects, use
> the [hsxComponent pattern](#hsx-component-pattern-recommended) below instead.

```tsx
import { id, render, route } from "@srdjan/hsx";

const routes = {
  todos: route("/todos", () => "/todos"),
};

const ids = {
  list: id("todo-list"),
};

function Page() {
  return (
    <html>
      <head>
        <title>HSX Demo</title>
      </head>
      <body>
        <form post={routes.todos} target={ids.list} swap="outerHTML">
          <input name="text" required />
          <button type="submit">Add</button>
        </form>
        <ul id="todo-list">{/* items */}</ul>
      </body>
    </html>
  );
}

Deno.serve(() => render(<Page />));
```

**Output HTML:**

```html
<html>
  <head><title>HSX Demo</title></head>
  <body>
    <form hx-post="/todos" hx-target="#todo-list" hx-swap="outerHTML">
      <input name="text" required>
      <button type="submit">Add</button>
    </form>
    <ul id="todo-list"></ul>
    <script src="/static/htmx.js"></script>
  </body>
</html>
```

## HSX Component Pattern (Recommended)

```ts
import { hsxComponent } from "jsr:@srdjan/hsx";

export const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"],

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

// Use as route in JSX
<form post={TodoList} target="#todo-list" swap="outerHTML" />;

// Use as handler in your server
if (TodoList.match(url.pathname)) return TodoList.handle(req);
```

TypeScript enforces that `handler` returns the same shape that `render` expects.
`methods` defaults to `["GET"]`; set `fullPage: true` when your render function
returns a full document instead of a fragment.

> **Choose one style:** Use either `hsxComponent` (recommended) or the low-level
> `route()` API, but don't mix them in the same project.

## hsxPage (full-page guardrails)

`hsxPage()` wraps a render function that returns a **complete** HTML document
and validates that:

- The root is `<html>` with `<head>` then `<body>`
- Semantic tags (header/main/section/article/h1-h6/p/ul/ol/li/etc.) have **no**
  `class` or inline `style`
- `<style>` tags live in `<head>`; CSS belongs there, not inline
- Composition stays within semantic HTML + HSX components

```tsx
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx";

const Widget = hsxComponent("/data", {
  handler: () => ({ message: "Hi" }),
  render: ({ message }) => <p>{message}</p>,
});

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <title>Guarded Page</title>
      <style>{"body { font-family: system-ui; }"}</style>
    </head>
    <body>
      <header>
        <h1>Welcome</h1>
      </header>
      <main>
        <section>
          <div data-surface="card">
            <Widget.Component />
          </div>
        </section>
      </main>
    </body>
  </html>
));

Deno.serve(() => Page.render());
```

## HSX Attributes

| HSX Attribute      | Renders To        | Description                    |
| ------------------ | ----------------- | ------------------------------ |
| `get`              | `hx-get`          | HTTP GET request               |
| `post`             | `hx-post`         | HTTP POST request              |
| `put`              | `hx-put`          | HTTP PUT request               |
| `patch`            | `hx-patch`        | HTTP PATCH request             |
| `delete`           | `hx-delete`       | HTTP DELETE request            |
| `target`           | `hx-target`       | Element to update              |
| `swap`             | `hx-swap`         | How to swap content            |
| `trigger`          | `hx-trigger`      | Event that triggers request    |
| `vals`             | `hx-vals`         | Additional values (JSON)       |
| `headers`          | `hx-headers`      | Custom headers (JSON)          |
| `behavior="boost"` | `hx-boost="true"` | Enable boost mode (`<a>` only) |

**Supported elements:** `form`, `button`, `a`, `div`, `span`, `section`,
`article`, `ul`, `tbody`, `tr`

## Type-Safe Routes

Use `route()` to create type-safe routes with automatic parameter extraction:

```tsx
const routes = {
  users: {
    list: route("/users", () => "/users"),
    detail: route("/users/:id", (p) => `/users/${p.id}`),
    posts: route(
      "/users/:userId/posts/:postId",
      (p) => `/users/${p.userId}/posts/${p.postId}`,
    ),
  },
};

// In JSX - params are type-checked:
<button get={routes.users.detail} params={{ id: 42 }}>View</button>;
// Renders: <button hx-get="/users/42">View</button>
```

## Branded IDs

Use `id()` to create type-safe element references:

```tsx
const ids = {
  list: id("todo-list"),    // Type: Id<"todo-list"> = "#todo-list"
  count: id("item-count"),
};

// In JSX:
<ul id="todo-list">...</ul>
<button get="/todos" target={ids.list} swap="innerHTML">Refresh</button>
// Renders: <button hx-get="/todos" hx-target="#todo-list" hx-swap="innerHTML">
```

## Wrapper Components

Create reusable wrapper components that pass through HSX attributes for cleaner
JSX:

```tsx
import type { HsxSwap, Urlish } from "jsr:@srdjan/hsx";

function Card(props: {
  children: unknown;
  title?: string;
  get?: Urlish;
  trigger?: string;
  swap?: HsxSwap;
}) {
  return (
    <div
      data-surface="card"
      data-layout="stack"
      data-gap="4"
      get={props.get}
      trigger={props.trigger}
      swap={props.swap}
    >
      {props.title && <h2>{props.title}</h2>}
      {props.children}
    </div>
  );
}

function Subtitle(props: { children: string }) {
  return (
    <div data-ui="prose">
      <p>{props.children}</p>
    </div>
  );
}
```

**Usage:**

```tsx
function Page() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Subtitle>Content loads lazily</Subtitle>
      <Card
        get={routes.stats}
        trigger="load"
        swap="innerHTML"
        title="Statistics"
      >
        <LoadingSkeleton />
      </Card>
      <Card title="Team Members">
        <UserList />
      </Card>
    </main>
  );
}
```

This pattern keeps your page components clean while maintaining full access to
HSX attributes. See the `examples/*/components.tsx` files for more examples.

## Configuration

Add this to your `deno.json`:

```jsonc
{
  "imports": {
    "hsx/jsx-runtime": "jsr:@srdjan/hsx/jsx-runtime"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx"
  }
}
```

JSX intrinsic element types (`<div>`, `<form>`, `<button>`, etc.) are
automatically included via the jsx-runtime import—no additional type
configuration needed.

### Serving HTMX

HSX injects `<script src="/static/htmx.js">` when HTMX is used. You must serve
it:

```ts
if (url.pathname === "/static/htmx.js") {
  const js = await Deno.readTextFile("./vendor/htmx/htmx.js");
  return new Response(js, {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
```

### Optional Styles Module

HSX includes an optional Auras-based CSS module with a single bundled
stylesheet:

```ts
import { HSX_STYLES_PATH, hsxStyles } from "jsr:@srdjan/hsx-styles";

// Serve the styles
if (url.pathname === HSX_STYLES_PATH) {
  return new Response(hsxStyles, {
    headers: { "content-type": "text/css; charset=utf-8" },
  });
}

// In your page head
<link rel="stylesheet" href={HSX_STYLES_PATH} />;
```

**Exports:**

- `hsxStyles` - Auras Elements + HSX brand layer
- `HSX_STYLES_PATH` - Default path: `/static/hsx.css`

**What you get:**

- Layout via data attributes:
  `data-layout="row|col|stack|cluster|grid|container"`, `data-gap`,
  `data-align`, `data-justify`, `data-grid-min`
- Surfaces via attributes: `data-surface="card"` and `data-surface="notice"`
- Button variants via `data-variant="solid|soft|ghost"`
- Theme controls via `data-theme="dark"`, `data-contrast="more"`, and
  `data-motion="reduce"`

**Customization:** Override CSS variables in your page:

```tsx
<style>
  {`:root { --primary: #10b981; --bg: #f0fdf4; --border: #a7f3d0; }`}
</style>;
```

Core tokens include `--primary`, `--primary-hover`, `--primary-subtle`, `--bg`,
`--surface`, `--surface-raised`, `--border`, `--text`, `--text-muted`, spacing
(`--space-*`), radius (`--radius-*`), typography (`--font-display`, `--text-*`,
`--leading-*`), shadows (`--shadow-*`), and layout tokens such as
`--container-max`.

To force dark mode for a specific page, add `data-theme="dark"` to `<html>`.

## HSX Widgets

The `@srdjan/hsx-widgets` package provides a widget protocol for building
components that work in two contexts: SSR through HSX routes, and embeddable
iframe shells for third-party pages.

### Define a Widget

A widget is a typed record with validation, styles, rendering, and optional data
loading:

```tsx
import type { Widget } from "jsr:@srdjan/hsx-widgets";
import { fail, ok } from "jsr:@srdjan/hsx-widgets";

export const greetingWidget: Widget<GreetingProps> = {
  tag: "hsx-greeting",
  props: { validate(raw) {/* ... */} },
  styles: `.hsx-greeting { padding: 1rem; }`,
  render: (props) => (
    <div class="hsx-greeting">
      <h2>{props.name}</h2>
    </div>
  ),
  load: async (params) => ok({ name: params.name, message: `Hello!` }),
  shadow: "open", // Optional: Declarative Shadow DOM
};
```

### Serve via SSR

Use `widgetToHsxComponent()` to bridge a widget into an HSX route:

```tsx
import { widgetToHsxComponent } from "jsr:@srdjan/hsx-widgets/ssr";

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
});

if (GreetingRoute.match(url.pathname)) return GreetingRoute.handle(req);
```

### Embed on Third-Party Pages

Serve iframe shells with `createEmbedHandler()`, then embed with a snippet:

```html
<div data-hsx-uri="https://yoursite.com/embed/hsx-greeting?name=World"></div>
<script src="https://yoursite.com/static/hsx/snippet.js"></script>
```

See [docs/WIDGETS.md](docs/WIDGETS.md) for the full widget guide including
Declarative Shadow DOM, style hoisting, and the build pipeline.

## Generative UI

The `@srdjan/hsx-genui` package lets AI models render interactive widgets
directly in a chat interface. The AI selects from a catalog of pre-registered
widgets via tool calling, and rendered HTML streams to the browser via SSE +
HTMX.

### Define GenUI Widgets

A GenUI widget extends the regular Widget protocol with AI metadata - a
description, JSON Schema for props, and optional few-shot examples:

```tsx
import type { GenUIWidget } from "jsr:@srdjan/hsx-widgets";
import { ok } from "jsr:@srdjan/hsx-widgets";

const weatherWidget: GenUIWidget<WeatherProps> = {
  tag: "hsx-weather",
  description:
    "Shows current weather for a city with temperature and conditions",
  schema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
  category: "display",
  props: {
    validate(raw) {
      /* ... */ return ok({ city: raw.city });
    },
  },
  styles: `.weather { padding: 1rem; }`,
  render: ({ city, temp }) => (
    <div class="weather">
      <h3>{city}</h3>
      <p>{temp}</p>
    </div>
  ),
  load: async (params) => {
    const data = await fetchWeather(params.city);
    return ok(data);
  },
};
```

### Create a Catalog and Handler

Register widgets in a catalog, then wire up the GenUI handler with an AI
provider:

```tsx
import { createCatalog } from "jsr:@srdjan/hsx-widgets";
import {
  createConversationStore,
  createGenUIHandler,
  createGenUIRoutes,
} from "jsr:@srdjan/hsx-genui";
import { claudeProvider } from "jsr:@srdjan/hsx-genui/claude";

// 1. Register widgets
const catalog = createCatalog([weatherWidget, chartWidget]);

// 2. Create handler with Claude provider
const handler = createGenUIHandler({
  catalog,
  provider: claudeProvider({ model: "claude-sonnet-4-6" }),
});

// 3. Create routes (page shell + POST endpoint + SSE stream)
const store = createConversationStore();
const { page, send, stream } = createGenUIRoutes({ handler, store });

// 4. Serve
Deno.serve((req) => {
  const { pathname } = new URL(req.url);
  if (page.match(pathname)) return page.handle(req);
  if (send.match(pathname)) return send.handle(req);
  if (stream.match(pathname)) return stream.handle(req);
  return new Response("Not Found", { status: 404 });
});
```

The user types a message, the AI selects a widget tool, HSX renders it
server-side, and the result streams into the page via SSE. No client-side
framework needed.

### Raw HTML Escape Hatch

Every catalog includes a built-in `hsx-raw` tool that lets the AI generate
arbitrary HTML when no pre-registered widget fits. Raw HTML is sanitized via an
allowlist-based sanitizer (disallowed tags, event handlers, and dangerous URI
schemes are stripped) and rendered inside a closed Shadow DOM for style
isolation.

### Design Guidelines

Include AI-readable design constraints in the system prompt:

```ts
import { createDesignGuidelines, formatForAI } from "jsr:@srdjan/hsx-widgets";

const guidelines = createDesignGuidelines({
  colors: "Use indigo accent. All colors via CSS custom properties.",
});

const handler = createGenUIHandler({
  catalog,
  provider,
  systemPrompt: formatForAI(guidelines),
  includeGuidelines: false, // we provided our own
});
```

### SSE Streaming

The core `@srdjan/hsx` package also exports `renderSSE()` for building custom
SSE endpoints from any async iterable of JSX:

```tsx
import { renderSSE } from "jsr:@srdjan/hsx/core";

async function* generateWidgets() {
  yield <div>Loading...</div>;
  const data = await fetchData();
  yield <Chart data={data} />;
}

Deno.serve(() => renderSSE(generateWidgets()));
```

Pairs with HTMX's SSE extension:

```tsx
<div ext="sse" sseConnect="/stream" sseSwap="message">
  {/* widgets appear here as SSE events arrive */}
</div>;
```

## Agent-Operable Apps

The `@srdjan/hsx-agent` package turns your existing application into an agent
action space. Where GenUI lets an AI render display widgets, this lets an AI
**drive your real endpoints**: each `hsxComponent` that declares `describe` +
`input` becomes an AI tool from the same definition that serves humans over
HTMX. The agent calls the component's own `handle()` and reads back the exact
semantic HTML a person would see. One definition, two consumers.

A component is agent-callable **only** when it declares both `describe` and
`input`. Components without them are invisible to the agent - no surprise
mutations.

```tsx
import { createAppAgent } from "@srdjan/hsx-agent";
import { claudeProvider } from "@srdjan/hsx-genui/claude";

// The same component the human form posts to is now also an AI tool:
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

// Humans use it via HTMX (unchanged):
<form post={AddTodo} swap="none" />;

// The agent uses the same definition as a tool:
const agent = createAppAgent({
  components: [AddTodo, ToggleTodo, ClearDone],
  provider: claudeProvider({ model: "claude-sonnet-4-6" }),
});
```

`AppAgent` is structurally a GenUI handler (`{ handleMessage, tools }`), so it
drops straight into the pre-built chat routes:

```tsx
import { createConversationStore, createGenUIRoutes } from "@srdjan/hsx-genui";

const store = createConversationStore();
const { send, stream } = createGenUIRoutes({
  handler: agent,
  store,
  basePath: "/copilot",
});
```

The agent's tool calls invoke the real components; each rendered fragment is
streamed to the browser and fed back to the model as its observation. In the
`todos-copilot` example the mutating components render the list with `swapOob`,
so whether a change comes from the human form or the agent, the canonical
`#todo-list` updates out-of-band while the agent narrates in the chat. Run it
with `ANTHROPIC_API_KEY=... deno task example:todos-copilot`.

`componentsToTools(components)` and `toRequest(component, args, origin)` are
exported for building custom agent loops on top of the same metadata.

## MCP Server

The `@srdjan/hsx-mcp` package mounts a Model Context Protocol endpoint into your
existing `Deno.serve`, so external MCP clients - Claude Code, Claude Desktop,
any MCP-capable tool - can discover and operate the same agent-callable
components. The in-app copilot needs a chat UI and an API key; the MCP endpoint
needs neither. Write a component once and it serves humans over HTMX, your
embedded copilot over SSE, and every MCP client over JSON-RPC, all through the
component's own `handle()`.

```tsx
import { createMcpHandler } from "@srdjan/hsx-mcp";

const mcp = createMcpHandler({
  components: todoComponents,
  serverName: "todos",
  // REQUIRED before exposing beyond localhost:
  // bearerToken: Deno.env.get("MCP_TOKEN"),
});

Deno.serve((req) => {
  const mcpResponse = mcp.handle(req);
  if (mcpResponse) return mcpResponse;

  // Your app routes...
  return new Response("Not found", { status: 404 });
});
```

Connect from Claude Code:

```bash
claude mcp add --transport http todos http://localhost:8000/mcp
```

Tool results carry the HTTP status plus the same rendered HTML a human receives,
so the agent observes the app as a user sees it. Pass a lens manifest
(`createHsxManifest()` output) as `manifest` to expose the app's full hypermedia
contract as MCP resource `hsx://manifest`.

The endpoint is stateless Streamable HTTP: POST-only, plain JSON responses, no
sessions, no SDK dependency - the protocol subset is hand-rolled like the
raw-fetch Claude adapter.

**Security:** MCP tools mutate real application state. Never mount the endpoint
on a publicly reachable server without `authorize` or `bearerToken`.

## HSX Lens

The `@srdjan/hsx-lens` package is an opt-in development workbench for the
hypermedia contract your app already declares. It renders explicit page samples,
collects author-time HSX attributes before they become `hx-*`, mirrors
component/widget/agent metadata, and serves a local manifest plus an HTML
workbench. It does not call component handlers.

```tsx
import { createHsxLens } from "@srdjan/hsx-lens";

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

By default, the workbench is served at `/__hsx` and the JSON manifest at
`/__hsx/manifest.json`. Mount it only in local or trusted development
environments.

## API Reference

### `render(node, options?)`

Renders JSX to an HTTP `Response`.

```ts
render(<Page />, {
  status: 200, // HTTP status code
  headers: {}, // Additional response headers
  maxDepth: 100, // Max nesting depth (DoS protection)
  maxNodes: 50000, // Max node count (DoS protection)
  injectHtmx: undefined, // true/false to force, undefined for auto
});
```

### `renderHtml(node, options?)`

Renders JSX to an HTML string.

```ts
const html = renderHtml(<Page />, {
  maxDepth: 100,
  maxNodes: 50000,
  injectHtmx: undefined,
});
```

### `route(path, build)`

Creates a type-safe route. Path parameters (`:param`) are automatically
extracted.

```ts
const r = route("/users/:id", (p) => `/users/${p.id}`);
// r.path = "/users/:id"
// r.build({ id: 42 }) = "/users/42"
```

### `id(name)`

Creates a branded element ID with `#` prefix.

```ts
const listId = id("todo-list");
// Type: Id<"todo-list">
// Value: "#todo-list"
```

### `Fragment`

JSX Fragment for grouping elements without a wrapper.

```tsx
<Fragment>
  <li>One</li>
  <li>Two</li>
</Fragment>;
```

### `hsxComponent(path, options)`

Co-locates a route, request handler, and render function.

```ts
const Comp = hsxComponent("/items/:id", {
  methods: ["GET", "DELETE"], // defaults to ["GET"]
  fullPage: false, // default: return fragment Response
  status: 200,
  headers: { "x-powered-by": "hsx" },
  handler: async (_req, params) => ({
    item: await getItem(params.id),
  }),
  render: ({ item }) => <div>{item.name}</div>,
});

// Works anywhere a Route does:
<button delete={Comp} params={{ id: 42 }} target="#row-42" />;
```

Unexpected handler or render errors return a generic `500` response, while
handlers can throw `HsxHttpError` for intentional boundary failures such as
invalid input.

## Examples

Run examples with `deno task`:

| Example               | Command                             | Description                                                     |
| --------------------- | ----------------------------------- | --------------------------------------------------------------- |
| **Todos**             | `deno task example:todos`           | Full CRUD with partial updates                                  |
| **Active Search**     | `deno task example:active-search`   | Live search as you type                                         |
| **Lazy Loading**      | `deno task example:lazy-loading`    | Deferred content loading                                        |
| **Form Validation**   | `deno task example:form-validation` | Server-side validation                                          |
| **Polling**           | `deno task example:polling`         | Live dashboard with intervals                                   |
| **Auras Showcase**    | `deno task example:auras-showcase`  | First-impression demo, live scene playground, compact reference |
| **Tabs & Modal**      | `deno task example:tabs-modal`      | Tab navigation and modals                                       |
| **HSX Components**    | `deno task example:hsx-components`  | Co-located route + handler + render                             |
| **HSX Page**          | `deno task example:hsx-page`        | Semantic full-page with hsxPage guardrails                      |
| **Low-Level API**     | `deno task example:low-level-api`   | Manual render/renderHtml without hsxPage/hsxComponent           |
| **HSX Widget**        | `deno task example:hsx-widget`      | Widget SSR route + iframe embed shell                           |
| **Todos Copilot**     | `deno task example:todos-copilot`   | AI copilot driving real hsxComponent endpoints                  |
| **Index of examples** | `examples/README.md`                | Quick guide to pick the right example                           |

For the HSX widget example, build client assets first:

```bash
deno task build:hsx-widgets
deno task example:hsx-widget
```

## Safety

- **HTML escaping** - All text content and attributes are escaped (XSS
  prevention)
- **Raw text elements** - `<script>` and `<style>` children are NOT escaped.
  Never pass user input.
- **No manual hx-\*** - Throws at render time. Use HSX aliases instead.
- **DoS protection** - Optional `maxDepth` and `maxNodes` limits

## Project Structure

```
packages/
  hsx/                   # Core package (@srdjan/hsx)
    mod.ts               # Main entry point
    jsx-runtime.ts       # Minimal JSX runtime (compiler requirement)
    render.ts            # SSR renderer with HTMX injection
    sse.ts               # SSE response helper (renderSSE, encodeSSEFrame)
    loading.ts           # Loading placeholder component
    hsx-normalize.ts     # HSX to hx-* attribute mapping
    hsx-types.ts         # Route, Id, HsxSwap, HsxTrigger types
    hsx-component.ts     # hsxComponent factory (route + handler + render)
    hsx-page.ts          # hsxPage guardrail for full-page layouts
  hsx-styles/            # Styles package (@srdjan/hsx-styles)
    mod.ts               # Entry point (bundles CSS strings)
    hsx-brand.css        # HSX brand layer
    vendor/              # Vendored Auras foundation
  hsx-widgets/           # HSX widgets package (@srdjan/hsx-widgets)
    mod.ts               # Main entry point
    widget.ts            # Widget protocol
    widget-wrapper.ts    # Shared Light DOM / Shadow DOM wrapping
    ssr-adapter.ts       # Widget -> hsxComponent bridge
    styles.ts            # Style collection for hsxPage
    result.ts            # Result<T,E> type utilities
    genui-widget.ts      # GenUIWidget<P> type (Widget + AI metadata)
    catalog.ts           # Widget catalog and tool definition generation
    raw-widget.ts        # Raw HTML escape hatch (Shadow DOM sandbox)
    sanitize.ts          # Allowlist-based HTML sanitizer
    design-guidelines.ts # AI-readable design system constraints
    embed/               # Embed helpers (iframe shell + snippet)
    build/               # Dual-compile build pipeline (esbuild + Preact)
  hsx-genui/             # Generative UI package (@srdjan/hsx-genui)
    mod.ts               # Main entry point
    provider.ts          # AIProvider port (Message, ToolCall, StreamEvent)
    handler.ts           # GenUI handler (AI conversation loop)
    conversation.ts      # Immutable Conversation + in-memory store
    components.tsx       # Pre-built chat page + send routes
    providers/
      claude.ts          # Claude/Anthropic adapter (raw fetch + SSE)
  hsx-agent/             # Agent-operable apps package (@srdjan/hsx-agent)
    mod.ts               # Main entry point
    app-agent.ts         # createAppAgent (AI drives real components)
    component-tools.ts   # componentsToTools (components -> AI tool defs)
    request-build.ts     # toRequest (tool-call args -> Request)
    types.ts             # AgentComponent structural type
  hsx-mcp/               # MCP server package (@srdjan/hsx-mcp)
    mod.ts               # Main entry point
    mcp-handler.ts       # createMcpHandler (Streamable HTTP endpoint)
    protocol.ts          # MCP method dispatch (initialize/tools/resources)
    jsonrpc.ts           # Hand-rolled JSON-RPC 2.0 envelope
    types.ts             # McpHandlerOptions, McpHandler
  hsx-lens/              # Dev workbench package (@srdjan/hsx-lens)
    mod.ts               # Main entry point
    manifest.ts          # createHsxManifest (samples -> manifest)
    workbench.tsx        # createHsxLens (local HTML + JSON routes)
examples/
  todos/                 # Full todo app example
  todos-copilot/         # Todos with an AI copilot driving real endpoints
  active-search/         # Search example
  lazy-loading/          # Lazy load example
  form-validation/       # Form validation example
  polling/               # Polling example
  tabs-modal/            # Tabs and modal example
  hsx-components/        # HSX Component pattern example
  hsx-page/              # hsxPage full-page guardrail example
  low-level-api/         # Manual render/renderHtml without hsxPage/hsxComponent
  hsx-widget/            # HSX widget SSR + embed shell example
vendor/htmx/
  htmx.js                # Vendored HTMX v4 (alpha)
docs/
  EXAMPLES.md            # Full examples matrix
  USER_GUIDE.md          # Comprehensive user guide
  HSX_OVERVIEW.md        # Architecture overview
  HTMX_INTEGRATION.md    # HTMX integration details
  WIDGETS.md             # HSX widget guide and embed workflow
```

## License

MIT - see [LICENSE](LICENSE)
