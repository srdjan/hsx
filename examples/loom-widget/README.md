# Loom Widget Example

This demo shows one widget used in two modes:

- SSR route mode through `widgetToHsxComponent`
- Embed shell mode through `createEmbedHandler`

## Run

```bash
deno task build:loom
deno task example:loom-widget
```

## Try

- `http://localhost:8000/widgets/greeting/World`
- `http://localhost:8000/embed/loom-greeting?name=World&message=Hi!`

## Host-Page Snippet

```html
<div data-loom-uri="https://yoursite.com/embed/loom-greeting?name=World&message=Hi!"></div>
<script src="https://yoursite.com/static/loom/snippet.js"></script>
```
