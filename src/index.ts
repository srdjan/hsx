/**
 * HSX - SSR-only JSX/TSX renderer for HTMX applications.
 *
 * HSX lets you write HTMX-style attributes (`get`, `post`, `target`, `swap`)
 * as if they were native HTML, then compiles them to `hx-*` attributes on the server.
 *
 * @example
 * ```tsx
 * import { render, route, id } from "@srdjan/hsx";
 *
 * const routes = { todos: route("/todos", () => "/todos") };
 * const ids = { list: id("todo-list") };
 *
 * function Page() {
 *   return (
 *     <html>
 *       <body>
 *         <button get={routes.todos} target={ids.list}>Load</button>
 *         <ul id="todo-list"></ul>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * Deno.serve(() => render(<Page />));
 * ```
 *
 * @module
 */

export type {
  ComponentType,
  JsxProps,
  Renderable,
  VNode,
} from "./jsx-runtime.ts";
export { Fragment } from "./jsx-runtime.ts";
export { render, renderHtml, type RenderHtmlOptions } from "./render.ts";
export * from "./hsx-types.ts";
export {
  type HsxComponent,
  hsxComponent,
  type HsxComponentOptions,
  type HttpMethod,
} from "./hsx-component.ts";
