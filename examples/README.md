# HSX Examples

Use these to see common patterns. All tasks run with `deno task example:<name>`.

- `todos` - classic CRUD todo list using `hsxPage` + `hsxComponent`
- `active-search` - live search with delayed triggers
- `lazy-loading` - load-on-reveal and load-on-page patterns
- `tabs-modal` - tabs and modal overlays with fragment endpoints
- `form-validation` - inline validation and submit validation endpoints
- `polling` - live stats/feed/status polling
- `hsx-components` - minimal co-located route/handler/render demo
- `hsx-page` - semantic full-page guardrails showcase
- `low-level-api` - direct `render` / `renderHtml` with `route()`
- `loom-widget` - widget SSR route and iframe embed shell (Loom)

## Pick The Right Example

- Building a full page? Start with `hsx-page` or `todos`.
- Need componentized endpoints? See `hsx-components`, `tabs-modal`, or `form-validation`.
- Looking for progressive loading? Check `lazy-loading`, `active-search`, or `polling`.
- Want full control routing? Use `low-level-api`.
- Need embeddable widgets? Use `loom-widget` and read `docs/WIDGETS.md`.

## Widget Example Setup

The Loom demo also serves built client bundles from `dist/loom`. Build them once before running:

```bash
deno task build:loom
deno task example:loom-widget
```
