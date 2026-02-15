# HSX Widgets Guide

This guide documents the current widget workflow in this repository.

HSX Widgets lets you define a `Widget<P>` once and use it in two places:

- SSR: render through HSX routes
- Embed: serve an iframe shell that loads a compiled client bundle

## Files To Start With

- `packages/hsx-widgets/examples/greeting-widget.tsx` - minimal widget definition
- `packages/hsx-widgets/examples/status-widget.tsx` - query-driven status widget example
- `examples/hsx-widget/server.tsx` - runnable SSR + embed example server
- `packages/hsx-widgets/ssr-adapter.ts` - `widgetToHsxComponent()` bridge
- `packages/hsx-widgets/embed/embed-handler.ts` - embed shell handler
- `packages/hsx-widgets/embed/snippet.ts` - host page snippet loader

## 1. Define A Widget

A widget is a typed record with validation, styles, pure rendering, and optional loading.

```tsx
import type { Widget } from "@srdjan/hsx-widgets";
import { ok, fail } from "@srdjan/hsx-widgets";

type GreetingProps = {
  readonly name: string;
  readonly message: string;
};

export const greetingWidget: Widget<GreetingProps> = {
  tag: "hsx-greeting",

  props: {
    validate(raw) {
      if (typeof raw !== "object" || raw === null) {
        return fail({ tag: "validation_error", message: "Expected object" });
      }
      const obj = raw as Record<string, unknown>;
      if (typeof obj.name !== "string" || obj.name.length === 0) {
        return fail({ tag: "validation_error", message: "Name is required", field: "name" });
      }
      if (typeof obj.message !== "string") {
        return fail({ tag: "validation_error", message: "Message must be a string", field: "message" });
      }
      return ok({ name: obj.name, message: obj.message });
    },
  },

  styles: `.hsx-greeting { font-family: system-ui, sans-serif; padding: 1rem; }`,

  render(props) {
    return (
      <div class="hsx-greeting">
        <h2>{props.name}</h2>
        <p>{props.message}</p>
      </div>
    );
  },

  load: async (params) => {
    const name = params.name;
    if (!name) return fail({ tag: "load_error", message: "Missing name parameter" });
    return ok({ name, message: `Hello, ${name}!` });
  },

  // Optional: Declarative Shadow DOM and observed attributes
  shadow: "open",                  // "open" | "closed" | "none" (default: none)
  observed: ["name", "message"],   // attributes to observe for client-side reactivity
};
```

## 2. Serve It Through HSX (SSR)

Use `widgetToHsxComponent()` to convert the widget into an HSX route.

```tsx
import { widgetToHsxComponent } from "@srdjan/hsx-widgets/ssr";

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
});

if (GreetingRoute.match(url.pathname)) {
  return GreetingRoute.handle(req);
}
```

Try it with:

```bash
deno task build:hsx-widgets
deno task example:hsx-widget
# then open /widgets/greeting/World and /widgets/status/Build%20Healthy?tone=ok
```

## 3. Serve Embed Shells For Iframes

The repo example uses `createEmbedHandler()` to serve `/embed/:tag` HTML shells.

```tsx
import { createEmbedHandler } from "../../packages/hsx-widgets/embed/embed-handler.ts";

const widgets = new Map([
  ["hsx-greeting", greetingWidget],
  ["hsx-status", statusWidget],
]);

const embedHandler = createEmbedHandler(widgets, {
  basePath: "/embed",
  bundlePath: "/static/hsx",
});

const res = embedHandler(req);
if (res) return res;
```

Each shell includes script URLs like `/static/hsx/hsx-greeting.js` and `/static/hsx/hsx-status.js`.

## 4. Build Embed Assets

Build both the widget bundle and the host snippet:

```bash
deno task build:hsx-widgets
```

By default this writes assets into `dist/hsx/` for both example widgets:

- `dist/hsx/hsx-greeting.js`
- `dist/hsx/hsx-status.js`
- `dist/hsx/snippet.js`

The example server (`examples/hsx-widget/server.tsx`) serves these files from `/static/hsx/*`.

## 5. Host Page Integration

On a third-party page, use a placeholder plus snippet script:

```html
<div data-hsx-uri="https://yoursite.com/embed/hsx-greeting?name=World&message=Hi!"></div>
<div data-hsx-uri="https://yoursite.com/embed/hsx-status?label=Build%20Healthy&tone=ok"></div>
<script src="https://yoursite.com/static/hsx/snippet.js"></script>
```

The snippet replaces the placeholder with an iframe and listens for resize messages.

## 6. Optional Style Hoisting For `hsxPage`

If you need styles in `<head>` (instead of inline in each widget wrapper), use `hoistStyles` and `WidgetStyles`.

```tsx
import { widgetToHsxComponent } from "@srdjan/hsx-widgets/ssr";
import { WidgetStyles } from "@srdjan/hsx-widgets/styles";

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
  hoistStyles: true,
});

const page = (
  <html>
    <head>
      <title>Widget Page</title>
      <WidgetStyles widgets={[greetingWidget]} />
    </head>
    <body>{/* content */}</body>
  </html>
);
```

## 7. Declarative Shadow DOM (SSR)

Widgets can render inside a Declarative Shadow DOM by setting the `shadow` field. This is useful for style isolation: the widget's CSS cannot leak into the host page.

**Enable it** by setting `shadow: "open"` or `shadow: "closed"` on your widget definition:

```ts
const myWidget: Widget<MyProps> = {
  tag: "hsx-example",
  shadow: "open",   // or "closed"
  // ...
};
```

**What SSR produces:** the adapter wraps content in a `<template shadowrootmode="...">` inside the custom element tag. The browser upgrades this to a real shadow root on parse.

**Key behaviors:**

- The wrapper element is the custom element tag (e.g., `<hsx-example>`) instead of `<div>`.
- Styles always go inside the shadow root. The `hoistStyles` option is ignored for shadow DOM widgets - scoped styles belong in the shadow root.
- When `shadow` is omitted or set to `"none"`, behavior is unchanged (light DOM `<div>` wrapper).

**Light DOM output** (default):

```html
<div data-widget="hsx-example">
  <style>.example { color: blue; }</style>
  <div class="example">Hello</div>
</div>
```

**Shadow DOM output** (`shadow: "open"`):

```html
<hsx-example data-widget="hsx-example">
  <template shadowrootmode="open">
    <style>.example { color: blue; }</style>
    <div class="example">Hello</div>
  </template>
</hsx-example>
```

## Quick Start Checklist

1. Define widgets (`packages/hsx-widgets/examples/greeting-widget.tsx` and `packages/hsx-widgets/examples/status-widget.tsx` as references).
2. Build assets: `deno task build:hsx-widgets`.
3. Run demo server: `deno task example:hsx-widget`.
4. Test SSR routes: `/widgets/greeting/World` and `/widgets/status/Build%20Healthy?tone=ok`.
5. Test embed shells: `/embed/hsx-greeting?name=World&message=Hi!` and `/embed/hsx-status?label=Build%20Healthy&tone=ok`.
