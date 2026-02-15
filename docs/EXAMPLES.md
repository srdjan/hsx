# Examples

HSX includes runnable examples for core HSX patterns and HSX widget flows.

Run any example with:

```bash
deno task example:<name>
```

## Example Matrix

| Example | Command | Entry File | What It Demonstrates |
| --- | --- | --- | --- |
| Todos | `deno task example:todos` | `examples/todos/server.tsx` | Full CRUD with `hsxPage` + `hsxComponent` |
| Active Search | `deno task example:active-search` | `examples/active-search/server.tsx` | Debounced live search with `trigger` modifiers |
| Lazy Loading | `deno task example:lazy-loading` | `examples/lazy-loading/server.tsx` | `revealed` and `load` triggers with skeleton states |
| Form Validation | `deno task example:form-validation` | `examples/form-validation/server.tsx` | Field and form-level server validation |
| Polling | `deno task example:polling` | `examples/polling/server.tsx` | Live dashboard updates via `every Ns` polling |
| Tabs & Modal | `deno task example:tabs-modal` | `examples/tabs-modal/server.tsx` | Tabbed content and modal lifecycle with partial swaps |
| HSX Components | `deno task example:hsx-components` | `examples/hsx-components/server.tsx` | Co-located route/handler/render with `hsxComponent` |
| HSX Page | `deno task example:hsx-page` | `examples/hsx-page/server.tsx` | Full-document guardrails with `hsxPage` |
| Low-Level API | `deno task example:low-level-api` | `examples/low-level-api/server.tsx` | Direct `render` / `renderHtml` and manual routing |
| HSX Widget | `deno task example:hsx-widget` | `examples/hsx-widget/server.tsx` | Two widgets across SSR routes + iframe embed shells |

## Widget Example Workflow

The HSX widget demo has one extra step so embed assets exist:

```bash
deno task build:hsx-widgets
deno task example:hsx-widget
```

Then try:

- `/widgets/greeting/World` for server-rendered widget output
- `/widgets/status/Build%20Healthy?tone=ok` for query-driven server-rendered widget output
- `/embed/hsx-greeting?name=World&message=Hi!` for embed shell output
- `/embed/hsx-status?label=Build%20Healthy&tone=ok` for status embed shell output

## Notes

- Most examples are self-contained in `server.tsx` plus optional `components.tsx`/`ids.ts` helpers.
- Not every example has a separate `routes.ts` file; routes are often co-located with components.
- By default, each example serves on port `8000` unless you override it in your own runtime wrapper.
