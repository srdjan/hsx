# HSX Widget Example

This demo shows two widgets used in two modes:

- SSR route mode through `widgetToHsxComponent`
- Embed shell mode through `createEmbedHandler`

## Run

```bash
deno task build:hsx-widgets
deno task example:hsx-widget
```

## Try

- `http://localhost:8000/widgets/greeting/World`
- `http://localhost:8000/widgets/status/Build%20Healthy?tone=ok`
- `http://localhost:8000/embed/hsx-greeting?name=World&message=Hi!`
- `http://localhost:8000/embed/hsx-status?label=Build%20Healthy&tone=ok`

## Host-Page Snippet

```html
<div data-hsx-uri="https://yoursite.com/embed/hsx-greeting?name=World&message=Hi!"></div>
<div data-hsx-uri="https://yoursite.com/embed/hsx-status?label=Build%20Healthy&tone=ok"></div>
<script src="https://yoursite.com/static/hsx/snippet.js"></script>
```
