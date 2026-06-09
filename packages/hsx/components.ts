/**
 * HSX Components - Higher-level abstractions for co-located route/handler/render.
 *
 * Use this when you only need hsxComponent/hsxPage without the low-level API.
 *
 * @example
 * ```tsx
 * import { hsxComponent, hsxPage } from "@srdjan/hsx/components";
 *
 * const TodoList = hsxComponent("/todos", {
 *   handler: () => ({ todos: [] }),
 *   render: ({ todos }) => <ul>{todos.map(t => <li>{t}</li>)}</ul>,
 * });
 *
 * const Page = hsxPage(() => (
 *   <html>
 *     <head><title>App</title></head>
 *     <body><TodoList.Component /></body>
 *   </html>
 * ));
 * ```
 *
 * @module
 */

// HSX Component and Page
export {
  type AgentDescriptor,
  type AgentInputSchema,
  type HsxComponent,
  hsxComponent,
  type HsxComponentOptions,
  HsxHttpError,
  type HttpMethod,
} from "./hsx-component.ts";
export { type HsxPage, hsxPage, type HsxPageOptions } from "./hsx-page.ts";
