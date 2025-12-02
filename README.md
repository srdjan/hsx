# HSX SSR Renderer

HSX is a small, SSR–only JSX/TSX renderer that treats **HTMX-style
interactions as if they were part of native HTML**, and compiles them
down to `hx-*` attributes on the server.

The browser **never** sees HSX-only attributes like `get`, `post`,
`target`, `swap`, `trigger`, `vals`, or `headers`. Those attributes
exist only in your TypeScript / JSX. During SSR, HSX:

1. Walks the JSX tree.
2. Normalizes HSX attributes on elements into standard `hx-*` attributes
   for HTMX (e.g. `get` → `hx-get`, `vals` → `hx-vals`).
3. Detects that HTMX is in use.
4. Automatically injects a `<script src="/static/htmx.js"></script>`
   just before `</body>` **only when needed**.
5. Returns plain HTML to the client.

There is **no client-side HSX runtime**. HSX is purely an SSR renderer.

## 1. Quick example

```tsx
/** @jsxImportSource ./src */
import { render } from "./src/index.ts";
import { routes } from "./examples/routes.ts";
import { ids } from "./examples/ids.ts";

function Page() {
  return (
    <html>
      <head>
        <title>HSX Todos</title>
        <meta charSet="utf-8" />
      </head>
      <body>
        <h1>Todos</h1>

        <form
          post={routes.todos.list}
          target={ids.list}
          swap="outerHTML"
          headers={{ "X-Flow-Id": "todos-example" }}
        >
          <input name="text" required />
          <button type="submit">Add</button>
        </form>

        <button
          type="button"
          get={routes.todos.list}
          target={ids.list}
          swap="outerHTML"
          vals={{ status: "all" }}
        >
          Refresh
        </button>

        <ul id="todo-list">
          {/* SSR list */}
        </ul>
      </body>
    </html>
  );
}

Deno.serve((_req) => render(<Page />));
```

On the server, HSX renders this to something like:

```html
<html>
  <head>
    <title>HSX Todos</title>
    <meta charset="utf-8">
  </head>
  <body>
    <h1>Todos</h1>

    <form hx-post="/todos" hx-target="#todo-list" hx-swap="outerHTML" hx-headers="{\"X-Flow-Id\":\"todos-example\"}">
      <input name="text" required>
      <button type="submit">Add</button>
    </form>

    <button
      type="button"
      hx-get="/todos"
      hx-target="#todo-list"
      hx-swap="outerHTML"
      hx-vals="{\"status\":\"all\"}">
      Refresh
    </button>

    <ul id="todo-list">...</ul>

    <script src="/static/htmx.js"></script>
  </body>
</html>
```

The browser only ever sees **standard HTML + HTMX attributes**.

## 2. Core ideas

- **SSR-only**: HSX has no client runtime. It emits static HTML strings.
- **HTML-from-the-future**: in JSX, you use attributes like `get`,
  `post`, `target`, `swap`, `trigger`, `vals`, and `headers` as if they
  were native to HTML.
- **Route-aware**: you can pass strongly-typed `Route` objects instead
  of raw strings.
- **Branded ids**: you can build `id("todo-list")` and get a branded
  `"#todo-list"` type.
- **HTMX behind the scenes**:
  - HSX maps HSX attributes → `hx-*` attributes.
  - HTMX v4 is vendored and served from `/static/htmx.js`.
  - HSX injects the `<script>` tag automatically, only when HSX/HTMX
    attributes appear in the JSX tree.

## 3. Project layout

- `src/jsx-runtime.ts` – minimal JSX runtime.
- `src/render.ts` – SSR renderer with HSX normalization and HTMX
  injection.
- `src/hsx-types.ts` – `Route`, `Id`, `HsxSwap`, `HsxTrigger`, etc.
- `src/hsx-normalize.ts` – logic to map HSX attributes to `hx-*`.
- `src/hsx-jsx.d.ts` – JSX typings that augment `form`, `button`, `a`,
  `div` with HSX attributes.
- **Manual `hx-*` attributes are rejected**: use HSX aliases (`get`,
  `post`, `target`, `swap`, `trigger`, `vals`, `headers`, `behavior`)
  instead of writing `hx-*` directly.
- `examples/` – runnable Deno examples (`todos`, `identity-widget`).
- `vendor/htmx/htmx.js` – vendored HTMX v4 placeholder.

## 4. Using HSX in your own project

### 4.1 Configure JSX for Deno

`deno.json`:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "./src"
  }
}
```

### 4.2 Author HTML-as-JSX with HSX attributes

On `<form>`, `<button>`, `<a>`, `<div>`, you can use:

- `get`, `post`, `put`, `patch`, `delete`: string or `Route<string, Params>`.
- `params`: additional parameters used with `Route.build`.
- `target`: `Id<string>` or plain string.
- `swap`: one of the HTMX swap modes.
- `trigger`: HTMX trigger string (e.g. `"submit"`, `"click"`, `"every 5s"`).
- `vals`: additional values object (→ `hx-vals`).
- `headers`: headers object (→ `hx-headers`).
- On `<a>` specifically, `behavior="boost"` becomes `hx-boost="true"`.

### 4.3 Serve vendored HTMX

HSX always injects `<script src="/static/htmx.js"></script>` when HTMX
is used. You are responsible for serving it:

```ts
if (url.pathname === "/static/htmx.js") {
  const js = await Deno.readTextFile(
    new URL("./vendor/htmx/htmx.js", import.meta.url),
  );
  return new Response(js, {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
```

## 5. SSR-only: what the browser actually sees

HSX attributes (`get`, `post`, `target`, `swap`, `trigger`, `vals`,
`headers`, etc.) live only in your JSX / TypeScript. They are removed
during SSR. The browser receives only:

- Standard HTML tags.
- `hx-*` attributes (for HTMX).
- The injected HTMX script tag.
