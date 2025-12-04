/**
 * HSX Component Model - Higher-level abstractions for building HSX applications.
 *
 * This module provides `hsxComponent` for co-located route/handler/render patterns
 * and `hsxPage` for full-page validation with semantic HTML enforcement.
 *
 * @example
 * ```tsx
 * import { hsxComponent, hsxPage } from "@srdjan/hsx/component-model";
 *
 * const TodoList = hsxComponent("/todos", {
 *   methods: ["GET"],
 *   handler: async () => {
 *     const todos = await fetchTodos();
 *     return { todos };
 *   },
 *   render: ({ todos }) => (
 *     <ul>
 *       {todos.map((t) => <li>{t.title}</li>)}
 *     </ul>
 *   ),
 * });
 *
 * const Page = hsxPage(() => (
 *   <html>
 *     <head><title>Todos</title></head>
 *     <body>
 *       <main><TodoList.Component todos={[]} /></main>
 *     </body>
 *   </html>
 * ));
 * ```
 *
 * @module
 */

export {
  hsxComponent,
  type HsxComponent,
  type HsxComponentOptions,
  type HttpMethod,
} from "./hsx-component.ts";

export { hsxPage, type HsxPage } from "./hsx-page.ts";
