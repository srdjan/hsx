# Loom Widget Example

This demo shows two widgets used in two modes:

- SSR route mode through `widgetToHsxComponent`
- Embed shell mode through `createEmbedHandler`

## Run

```bash
deno task build:loom
deno task example:loom-widget
```

## Try

- `http://localhost:8000/widgets/greeting/World`
- `http://localhost:8000/widgets/status/Build%20Healthy?tone=ok`
- `http://localhost:8000/embed/loom-greeting?name=World&message=Hi!`
- `http://localhost:8000/embed/loom-status?label=Build%20Healthy&tone=ok`

## Host-Page Snippet

```html
<div data-loom-uri="https://yoursite.com/embed/loom-greeting?name=World&message=Hi!"></div>
<div data-loom-uri="https://yoursite.com/embed/loom-status?label=Build%20Healthy&tone=ok"></div>
<script src="https://yoursite.com/static/loom/snippet.js"></script>
```
