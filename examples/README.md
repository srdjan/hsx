# HSX Examples

Use these to see common patterns. All tasks run with `deno task example:<name>`.

- `todos` – classic CRUD todo list using `hsxPage` + `hsxComponent`
- `active-search` – live search with throttled triggers (`hsxPage` +
  `hsxComponent`)
- `lazy-loading` – load-on-view + infinite scroll components
- `tabs-modal` – tabs + modal overlays using component endpoints
- `form-validation` – inline validation endpoints with branded targets
- `polling` – live stats/feed/status polling
- `hsx-components` – minimal demo of co-located route/handler/render
- `hsx-page` – semantic page guardrails showcase
- `low-level-api` – direct `render`/`renderHtml` without hsxPage/hsxComponent
  (escape hatch)

## Pick the right example

- Building a full page? Start with `hsx-page` or `todos`.
- Need componentized endpoints? See `hsx-components`, `tabs-modal`, or
  `form-validation`.
- Looking for progressive loading? Check `lazy-loading`, `active-search`, or
  `polling`.
- Want full control / custom routing? Use `low-level-api` as a reference.
