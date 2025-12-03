# HSX

SSR-only JSX/TSX renderer for Deno that compiles HTMX-style attributes to `hx-*` on the server.

> Disclaimer: this was a quick hack in my free time, held together by vibe coding and espresso. I like it a lot, but consider it an early release.

## TL;DR: JSX for HTML + HTMX.

## Features

- **SSR-only** - No client runtime. Outputs plain HTML.
- **HTMX as HTML** - Write `get`, `post`, `target`, `swap` as native attributes
- **Type-safe routes** - Branded `Route<Path>` types with automatic parameter inference
- **Branded IDs** - `id("name")` returns `Id<"name">` typed as `"#name"`
- **Auto HTMX injection** - `<script src="/static/htmx.js">` injected when needed
- **No manual hx-\*** - Throws at render time if you write `hx-get` directly

## Installation

### From JSR

```bash
deno add jsr:@srdjan/hsx
```

Or import directly:

```ts
import { render, route, id } from "jsr:@srdjan/hsx";
```

### From Source

Clone and import:

```ts
import { render, route, id } from "./src/index.ts";
```

## Quick Start

```tsx
/** @jsxImportSource ./src */
import { render, route, id } from "./src/index.ts";

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

## HSX Attributes

| HSX Attribute | Renders To | Description |
|---------------|------------|-------------|
| `get` | `hx-get` | HTTP GET request |
| `post` | `hx-post` | HTTP POST request |
| `put` | `hx-put` | HTTP PUT request |
| `patch` | `hx-patch` | HTTP PATCH request |
| `delete` | `hx-delete` | HTTP DELETE request |
| `target` | `hx-target` | Element to update |
| `swap` | `hx-swap` | How to swap content |
| `trigger` | `hx-trigger` | Event that triggers request |
| `vals` | `hx-vals` | Additional values (JSON) |
| `headers` | `hx-headers` | Custom headers (JSON) |
| `behavior="boost"` | `hx-boost="true"` | Enable boost mode (`<a>` only) |

**Supported elements:** `form`, `button`, `a`, `div`, `span`, `section`, `article`, `ul`, `tbody`, `tr`

## Type-Safe Routes

Use `route()` to create type-safe routes with automatic parameter extraction:

```tsx
const routes = {
  users: {
    list: route("/users", () => "/users"),
    detail: route("/users/:id", (p) => `/users/${p.id}`),
    posts: route("/users/:userId/posts/:postId", (p) =>
      `/users/${p.userId}/posts/${p.postId}`
    ),
  },
};

// In JSX - params are type-checked:
<button get={routes.users.detail} params={{ id: 42 }}>View</button>
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

Create reusable wrapper components that pass through HSX attributes for cleaner JSX:

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
      <Card get={routes.stats} trigger="load" swap="innerHTML" title="Statistics">
        <LoadingSkeleton />
      </Card>
      <Card title="Team Members">
        <UserList />
      </Card>
    </main>
  );
}
```

This pattern keeps your page components clean while maintaining full access to HSX attributes. See the `examples/*/components.tsx` files for more examples.

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

JSX intrinsic element types (`<div>`, `<form>`, `<button>`, etc.) are automatically included via the jsx-runtime import—no additional type configuration needed.

### Serving HTMX

HSX injects `<script src="/static/htmx.js">` when HTMX is used. You must serve it:

```ts
if (url.pathname === "/static/htmx.js") {
  const js = await Deno.readTextFile("./vendor/htmx/htmx.js");
  return new Response(js, {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
```

## API Reference

### `render(node, options?)`

Renders JSX to an HTTP `Response`.

```ts
render(<Page />, {
  status: 200,           // HTTP status code
  headers: {},           // Additional response headers
  maxDepth: 100,         // Max nesting depth (DoS protection)
  maxNodes: 50000,       // Max node count (DoS protection)
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

Creates a type-safe route. Path parameters (`:param`) are automatically extracted.

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
</Fragment>
```

## Examples

Run examples with `deno task`:

| Example | Command | Description |
|---------|---------|-------------|
| **Todos** | `deno task example:todos` | Full CRUD with partial updates |
| **Active Search** | `deno task example:active-search` | Live search as you type |
| **Lazy Loading** | `deno task example:lazy-loading` | Deferred content loading |
| **Form Validation** | `deno task example:form-validation` | Server-side validation |
| **Polling** | `deno task example:polling` | Live dashboard with intervals |
| **Tabs & Modal** | `deno task example:tabs-modal` | Tab navigation and modals |

## Safety

- **HTML escaping** - All text content and attributes are escaped (XSS prevention)
- **Raw text elements** - `<script>` and `<style>` children are NOT escaped. Never pass user input.
- **No manual hx-\*** - Throws at render time. Use HSX aliases instead.
- **DoS protection** - Optional `maxDepth` and `maxNodes` limits

## Project Structure

```
src/
  index.ts          # Public API exports
  jsx-runtime.ts    # Minimal JSX runtime
  render.ts         # SSR renderer with HTMX injection
  hsx-normalize.ts  # HSX to hx-* attribute mapping
  hsx-types.ts      # Route, Id, HsxSwap, HsxTrigger types
  hsx-jsx.d.ts      # JSX type declarations
examples/
  todos/            # Full todo app example
  active-search/    # Search example
  lazy-loading/     # Lazy load example
  form-validation/  # Form validation example
  polling/          # Polling example
  tabs-modal/       # Tabs and modal example
vendor/htmx/
  htmx.js           # Vendored HTMX v4 (alpha)
docs/
  USER_GUIDE.md     # Comprehensive user guide
  HSX_OVERVIEW.md   # Architecture overview
  HTMX_INTEGRATION.md # HTMX integration details
```

## License

MIT - see [LICENSE](LICENSE)
