# HTMX Integration

HSX integrates with HTMX entirely on the **server side**.

## Author-time (JSX)

You write HTML-ish JSX using HSX attributes:

- `get`, `post`, `put`, `patch`, `delete` - HTTP verbs
- `params` - Route parameters
- `target`, `swap`, `trigger` - HTMX control
- `vals`, `headers` - Additional data
- `behavior="boost"` on `<a>` - Enable boost mode

### Example

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
</button>;
```

## Normalization (SSR)

During rendering, HSX:

1. **Resolves routes** - Route objects become concrete URLs
2. **Maps attributes** - HSX attributes become HTMX attributes
3. **Removes HSX attributes** - Only `hx-*` appear in output

### Attribute Mapping

| HSX Attribute      | HTMX Attribute    | Notes                                                                                    |
| ------------------ | ----------------- | ---------------------------------------------------------------------------------------- |
| `get`              | `hx-get`          | URL string or Route                                                                      |
| `post`             | `hx-post`         | URL string or Route                                                                      |
| `put`              | `hx-put`          | URL string or Route                                                                      |
| `patch`            | `hx-patch`        | URL string or Route                                                                      |
| `delete`           | `hx-delete`       | URL string or Route                                                                      |
| `target`           | `hx-target`       | CSS selector or Id                                                                       |
| `swap`             | `hx-swap`         | Swap strategy                                                                            |
| `trigger`          | `hx-trigger`      | Event specification                                                                      |
| `vals`             | `hx-vals`         | JSON-encoded object                                                                      |
| `headers`          | `hx-headers`      | JSON-encoded object                                                                      |
| `indicator`        | `hx-indicator`    | CSS selector or Id; elements that get `htmx-request` during the request                  |
| `disableElt`       | `hx-disable`      | CSS selector or Id to disable during the request (HTMX 4; replaces v2 `hx-disabled-elt`) |
| `sync`             | `hx-sync`         | Request synchronization spec, e.g. `this:abort`                                          |
| `confirm`          | `hx-confirm`      | Confirmation prompt before the request                                                   |
| `select`           | `hx-select`       | CSS selector for the part of the response to swap                                        |
| `pushUrl`          | `hx-push-url`     | `true`/`false` or an explicit URL; booleans render as `"true"`/`"false"`                 |
| `swapOob`          | `hx-swap-oob`     | `true` or a swap spec; on returned fragment elements for out-of-band swaps               |
| `behavior="boost"` | `hx-boost="true"` | Anchor boost mode                                                                        |

### Loading indicators in HTMX 4

HTMX 4 applies the `htmx-request` class to the triggering element by default,
and to the element(s) named by `indicator` when it is set. Point `indicator` at
a separate element (a spinner, a sibling, a region) to drive that element's
loading state instead of, or in addition to, the trigger:

```tsx
<button get={routes.search} indicator={ids.spinner}>Search</button>
<span id="spinner" class="htmx-indicator">Loading...</span>
```

Booleans on `pushUrl`/`swapOob` are emitted as the literal strings
`"true"`/`"false"`, not as bare attributes, because HTMX treats a valueless
`hx-push-url` as falsy.

### Output HTML

The browser sees:

```html
<button
  type="button"
  hx-get="/todos"
  hx-target="#todo-list"
  hx-swap="outerHTML"
  hx-vals='{"status":"open"}'
  hx-headers='{"X-Tenant-Id":"tenant-123"}'
>
  Show open
</button>
```

## Supported Elements

HSX attributes work on these elements:

| Element   | Primary Use                    |
| --------- | ------------------------------ |
| `form`    | Form submissions with POST/GET |
| `button`  | Actions with any HTTP verb     |
| `a`       | Links with boost mode          |
| `div`     | Generic containers             |
| `span`    | Inline containers              |
| `section` | Semantic sections              |
| `article` | Semantic articles              |
| `ul`      | Lists                          |
| `tbody`   | Table bodies                   |
| `tr`      | Table rows                     |

## Script Injection (SSR)

If any HSX/HTMX usage is detected in the tree, HSX injects:

```html
<script src="/static/htmx.js"></script>
```

just before `</body>`.

### Detection Logic

The injection happens when:

- Any HSX attribute (`get`, `post`, `target`, etc.) is used
- The `injectHtmx` option is explicitly `true`

The injection is skipped when:

- No HSX attributes are used AND `injectHtmx` is not `true`
- The `injectHtmx` option is explicitly `false`

### Serving HTMX

You provide the HTMX bundle at `/static/htmx.js`:

```ts
if (url.pathname === "/static/htmx.js") {
  const js = await Deno.readTextFile("./vendor/htmx/htmx.js");
  return new Response(js, {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
```

The vendored HTMX file is included at `vendor/htmx/htmx.js`.

## Manual hx-* Prevention

HSX throws an error if you try to use `hx-*` attributes directly:

```tsx
// This throws an error:
<button hx-get="/data">Load</button>
// Error: "Manual hx-* attributes are not allowed. Use HSX aliases..."

// Use HSX attributes instead:
<button get="/data">Load</button>
```

This ensures all HTMX attributes go through HSX normalization, enabling:

- Consistent route resolution
- Type checking
- Automatic HTMX detection

## HTMX Version

HSX includes vendored HTMX v4 (alpha). The file is located at:

```
vendor/htmx/htmx.js
```

You can replace this with a different HTMX version if needed, or use
`injectHtmx: false` and include your own script tag.
