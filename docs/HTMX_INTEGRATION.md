# HTMX Integration

HSX integrates with HTMX entirely on the **server side**.

## Author-time (JSX)

You write HTML-ish JSX using HSX attributes:

- `get`, `post`, `put`, `patch`, `delete`
- `params`
- `target`, `swap`, `trigger`
- `vals`, `headers`
- `behavior="boost"` on `<a>`

Example:

```tsx
<button
  type="button"
  get={routes.todos.list}
  target={ids.list}
  swap="outerHTML"
  vals={{ status: "open" }}
  headers={{ "X-Tenant-Id": "tenant-123" }}
>
  Show open
</button>
```

## Normalization (SSR)

During rendering, HSX:

- Resolves route objects into concrete URLs.
- Maps HSX attributes to HTMX attributes:

  - `get` → `hx-get`
  - `post` → `hx-post`
  - `target` → `hx-target`
  - `swap` → `hx-swap`
  - `trigger` → `hx-trigger`
  - `vals` → `hx-vals` (JSON-encoded)
  - `headers` → `hx-headers` (JSON-encoded)
  - `behavior="boost"` → `hx-boost="true"`

- Removes the HSX-only attributes (`get`, `post`, `vals`, etc.) so they
  do not appear in the HTML.

The HTML the browser sees looks like:

```html
<button
  type="button"
  hx-get="/todos"
  hx-target="#todo-list"
  hx-swap="outerHTML"
  hx-vals="{&quot;status&quot;:&quot;open&quot;}"
  hx-headers="{&quot;X-Tenant-Id&quot;:&quot;tenant-123&quot;}"
>
  Show open
</button>
```

## Script injection (SSR)

If any HSX/HTMX usage is detected in the tree, HSX injects:

```html
<script src="/static/htmx.js"></script>
```

just before `</body>`.

You provide the HTMX v4 bundle at `/static/htmx.js` using your Deno
server (see `examples/todos/server.ts`).
