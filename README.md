# HSX is love, HSX is life

First things, first... What the hack does HSX stand for? I'll say it's '**H**TML
for **S**erver-Side e**X**tensions'. :0

But, honestly, I prefer: **H**TMX **S**laps **X**tremely :)

SSR-only JSX/TSX renderer for Deno that hides HTMX-style attributes away during the rendering process, and compiles them to `hx-*` attributes.

> Disclaimer: this was a quick hack in my free time, held together by vibe
> coding and espresso. I like it a lot, but consider it an early release. I feel it is getting better (a lot)

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
- **Widgets** - Define once, serve via SSR or embed as iframes with
  Declarative Shadow DOM

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

HSX is a monorepo with three packages:

```ts
// Core - JSX rendering, type-safe routes, hsxComponent, hsxPage
import { Fragment, hsxComponent, hsxPage, id, render, route } from "jsr:@srdjan/hsx";

// Styles - ready-to-use CSS with theming support
import { HSX_STYLES_PATH, hsxStyles } from "jsr:@srdjan/hsx-styles";

// Widgets - embeddable widget protocol + SSR/embed adapters
import { widgetToHsxComponent } from "jsr:@srdjan/hsx-widgets/ssr";
```

Install individually:

```bash
deno add jsr:@srdjan/hsx
deno add jsr:@srdjan/hsx-styles
deno add jsr:@srdjan/hsx-widgets
```

### Selective Imports (Tree-Shaking)

For smaller bundles, import only what you need:

```ts
// Core only - render, route, id, Fragment (smaller bundle)
import { render, route, id, Fragment } from "jsr:@srdjan/hsx/core";

// Components only - hsxComponent, hsxPage
import { hsxComponent, hsxPage } from "jsr:@srdjan/hsx/components";

// Everything (default)
import { render, route, hsxComponent, hsxPage } from "jsr:@srdjan/hsx";
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
import {
  HSX_STYLES_PATH,
  hsxStyles,
  hsxStylesDark,
} from "jsr:@srdjan/hsx-styles";

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

- `hsxStyles` - Default light theme (indigo accent)
- `hsxStylesDark` - Dark theme variant
- `HSX_STYLES_PATH` - Default path: `/static/hsx.css`

**What you get (Fizzy-inspired defaults):**

- Layout helpers: `container`, `stack`, `cluster`, `sidebar`, `split`, `auto-grid`, `hero`, `bleed`, `measure`
- Components: `card`, `surface`, `callout.{info|success|warning|danger}`, `badge`, `pill`, `chip`, `divider`, `list-inline`, button sizes (`btn-sm`, `btn-lg`) and variants (`btn-ghost`, `btn-outline`)
- Utilities: text sizes (`text-xs` … `text-3xl`), spacing (`p-sm`, `px-md`, `space-y-md`), flex/grid helpers (`flex`, `cols-2/3`, `gap-sm`), shadows/rounding (`shadow-sm`, `rounded-lg`), visibility (`visually-hidden`, `hidden`)

**Customization:** Override CSS variables in your page:

```tsx
<style>{`:root { --hsx-accent: #10b981; --hsx-bg: #f0fdf4; }`}</style>;
```

Available variables: `--hsx-accent`, `--hsx-accent-hover`, `--hsx-bg`,
`--hsx-surface`, `--hsx-border`, `--hsx-text`, `--hsx-muted`, `--hsx-error`,
`--hsx-success`, `--hsx-info`, `--hsx-warning`, `--hsx-neutral`, spacing
(`--hsx-space-2xs` … `--hsx-space-3xl`), radius (`--hsx-radius-*`), typography
(`--hsx-font-size-*`, `--hsx-leading-*`), shadows (`--hsx-shadow-*`),
breakpoints (`--hsx-breakpoint-sm|md|lg`), and layout tokens
(`--hsx-container-max`, `--hsx-container-padding`, `--hsx-measure`).

## HSX Widgets

The `@srdjan/hsx-widgets` package provides a widget protocol for building
components that work in two contexts: SSR through HSX routes, and embeddable
iframe shells for third-party pages.

### Define a Widget

A widget is a typed record with validation, styles, rendering, and optional
data loading:

```tsx
import type { Widget } from "jsr:@srdjan/hsx-widgets";
import { ok, fail } from "jsr:@srdjan/hsx-widgets";

export const greetingWidget: Widget<GreetingProps> = {
  tag: "hsx-greeting",
  props: { validate(raw) { /* ... */ } },
  styles: `.hsx-greeting { padding: 1rem; }`,
  render: (props) => <div class="hsx-greeting"><h2>{props.name}</h2></div>,
  load: async (params) => ok({ name: params.name, message: `Hello!` }),
  shadow: "open",  // Optional: Declarative Shadow DOM
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
| **HSX Widget**       | `deno task example:hsx-widget`     | Widget SSR route + iframe embed shell                 |
| **Index of examples** | `examples/README.md`                | Quick guide to pick the right example                 |

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
    hsx-normalize.ts     # HSX to hx-* attribute mapping
    hsx-types.ts         # Route, Id, HsxSwap, HsxTrigger types
    hsx-jsx.d.ts         # JSX type declarations
    hsx-component.ts     # hsxComponent factory (route + handler + render)
    hsx-page.ts          # hsxPage guardrail for full-page layouts
  hsx-styles/            # Styles package (@srdjan/hsx-styles)
    mod.ts               # Main entry point (CSS themes)
  hsx-widgets/          # HSX widgets package (@srdjan/hsx-widgets)
    mod.ts               # Main entry point
    widget.ts            # Widget protocol
    ssr-adapter.ts       # Widget -> hsxComponent bridge (with Declarative Shadow DOM)
    styles.ts            # Style collection for hsxPage
    result.ts            # Result<T,E> type utilities
    embed/               # Embed helpers (iframe shell + snippet)
    build/               # Dual-compile build pipeline (esbuild + Preact)
examples/
  todos/                 # Full todo app example
  active-search/         # Search example
  lazy-loading/          # Lazy load example
  form-validation/       # Form validation example
  polling/               # Polling example
  tabs-modal/            # Tabs and modal example
  hsx-components/        # HSX Component pattern example
  hsx-page/              # hsxPage full-page guardrail example
  low-level-api/         # Manual render/renderHtml without hsxPage/hsxComponent
  hsx-widget/           # HSX widget SSR + embed shell example
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
