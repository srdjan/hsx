# Examples

## Todos with partial updates

See `examples/todos/server.ts`.

Key ideas:

- SSR full page at `/`.
- HTMX endpoint at `/todos` that returns just the `<ul>` fragment.
- HSX attributes on `<form>` and `<button>`:

```tsx
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
```

HSX renders these attributes into `hx-*` for HTMX, and injects the
`/static/htmx.js` script automatically.

## Hosted identity widget (no HSX attributes)

See `examples/identity-widget/server.ts`.

This example demonstrates using HSX as a plain JSX SSR renderer with a
small JSON boot script. It does not use HSX/HTMX attributes, so no
HTMX script is injected.

## Polling example

You can also use `trigger` for polling:

```tsx
<div
  get="/status"
  target={ids.status}
  swap="innerHTML"
  trigger="every 10s"
  vals={{ region: "us-east" }}
>
  <p>Loading status…</p>
</div>
```

HSX will render this with `hx-get`, `hx-target`, `hx-swap`,
`hx-trigger="every 10s"`, and an `hx-vals` JSON payload.
