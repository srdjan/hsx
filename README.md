# HSX

SSR-only JSX/TSX renderer for Deno that compiles HTMX-style attributes to `hx-*`
on the server.

> Disclaimer: this was a quick hack in my free time, held together by vibe
> coding and espresso. I like it a lot, but consider it an early release.

## TL;DR: JSX for HTML + HTMX.

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

## Installation

### From JSR

```bash
deno add jsr:@srdjan/hsx
```

Or import directly:

```ts
import { id, render, route } from "jsr:@srdjan/hsx";
```

### Selective Imports (Tree-Shaking)

HSX supports modular imports for smaller bundles:

```ts
// Core only - rendering + type-safe routes (excludes hsxComponent/hsxPage)
import { render, route, id, Fragment } from "jsr:@srdjan/hsx/core";

// Component model only - higher-level abstractions
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx/component-model";

// Everything (default)
import { render, route, hsxComponent, hsxPage } from "jsr:@srdjan/hsx";

// Optional styles - ready-to-use CSS with theming support
import { hsxStyles, HSX_STYLES_PATH } from "jsr:@srdjan/hsx/styles";
```

### From Source

Clone and import:

```ts
import { id, render, route } from "./src/index.ts";
```

## Quick Start

```tsx
/** @jsxImportSource ./src */
import { id, render, route } from "./src/index.ts";

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

## HSX Component Pattern (route + handler + render)

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
          <div class="card">
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
    <div class="card" get={props.get} trigger={props.trigger} swap={props.swap}>
      {props.title && <h2>{props.title}</h2>}
      {props.children}
    </div>
  );
}

function Subtitle(props: { children: string }) {
  return <p class="subtitle">{props.children}</p>;
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

HSX includes an optional CSS module with a default theme and dark variant:

```ts
import { hsxStyles, hsxStylesDark, HSX_STYLES_PATH } from "jsr:@srdjan/hsx/styles";

// Serve the styles
if (url.pathname === HSX_STYLES_PATH) {
  return new Response(hsxStyles, {
    headers: { "content-type": "text/css; charset=utf-8" },
  });
}

// In your page head
<link rel="stylesheet" href={HSX_STYLES_PATH} />
```

**Exports:**
- `hsxStyles` - Default light theme (indigo accent)
- `hsxStylesDark` - Dark theme variant
- `HSX_STYLES_PATH` - Default path: `/static/hsx.css`

**Customization:** Override CSS variables in your page:

```tsx
<style>{`:root { --hsx-accent: #10b981; --hsx-bg: #f0fdf4; }`}</style>
```

Available variables: `--hsx-accent`, `--hsx-bg`, `--hsx-surface`, `--hsx-border`,
`--hsx-text`, `--hsx-muted`, `--hsx-error`, `--hsx-success`, spacing (`--hsx-space-*`),
and radius (`--hsx-radius-*`).

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

## Examples

Run examples with `deno task`:

| Example               | Command                             | Description                                           |
| --------------------- | ----------------------------------- | ----------------------------------------------------- |
| **Todos**             | `deno task example:todos`           | Full CRUD with partial updates                        |
| **Active Search**     | `deno task example:active-search`   | Live search as you type                               |
| **Lazy Loading**      | `deno task example:lazy-loading`    | Deferred content loading                              |
| **Form Validation**   | `deno task example:form-validation` | Server-side validation                                |
| **Polling**           | `deno task example:polling`         | Live dashboard with intervals                         |
| **Tabs & Modal**      | `deno task example:tabs-modal`      | Tab navigation and modals                             |
| **HSX Components**    | `deno task example:hsx-components`  | Co-located route + handler + render                   |
| **HSX Page**          | `deno task example:hsx-page`        | Semantic full-page with hsxPage guardrails            |
| **Low-Level API**     | `deno task example:low-level-api`   | Manual render/renderHtml without hsxPage/hsxComponent |
| **Index of examples** | `examples/README.md`                | Quick guide to pick the right example                 |

## Safety

- **HTML escaping** - All text content and attributes are escaped (XSS
  prevention)
- **Raw text elements** - `<script>` and `<style>` children are NOT escaped.
  Never pass user input.
- **No manual hx-\*** - Throws at render time. Use HSX aliases instead.
- **DoS protection** - Optional `maxDepth` and `maxNodes` limits

## Project Structure

```
src/
  index.ts          # Main entry - exports everything
  core.ts           # Core module - render, route, id, Fragment, types
  component-model.ts # Component module - hsxComponent, hsxPage
  styles.ts         # Optional CSS module with themes
  jsx-runtime.ts    # Minimal JSX runtime (compiler requirement)
  render.ts         # SSR renderer with HTMX injection
  hsx-normalize.ts  # HSX to hx-* attribute mapping
  hsx-component.ts  # hsxComponent factory (route + handler + render)
  hsx-page.ts       # hsxPage guardrail for full-page layouts
  hsx-types.ts      # Route, Id, HsxSwap, HsxTrigger types
  hsx-jsx.d.ts      # JSX type declarations
examples/
  todos/            # Full todo app example
  active-search/    # Search example
  lazy-loading/     # Lazy load example
  form-validation/  # Form validation example
  polling/          # Polling example
  tabs-modal/       # Tabs and modal example
  hsx-components/   # HSX Component pattern example
  hsx-page/         # hsxPage full-page guardrail example
  low-level-api/    # Manual render/renderHtml without hsxPage/hsxComponent
vendor/htmx/
  htmx.js           # Vendored HTMX v4 (alpha)
docs/
  USER_GUIDE.md     # Comprehensive user guide
  HSX_OVERVIEW.md   # Architecture overview
  HTMX_INTEGRATION.md # HTMX integration details
```

## License

MIT - see [LICENSE](LICENSE)
