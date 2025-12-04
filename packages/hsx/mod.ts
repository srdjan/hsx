/**
 * HSX Core - SSR-only JSX/TSX renderer for HTMX applications.
 *
 * HSX lets you write HTMX-style attributes (`get`, `post`, `target`, `swap`)
 * as if they were native HTML, then compiles them to `hx-*` attributes on the server.
 *
 * @example
 * ```tsx
 * import { render, route, id, Fragment } from "@srdjan/hsx";
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

// Core rendering
export { render, renderHtml, type RenderHtmlOptions } from "./render.ts";

// JSX utilities
export { Fragment } from "./jsx-runtime.ts";
export type {
  ComponentType,
  JsxProps,
  Renderable,
  VNode,
} from "./jsx-runtime.ts";

// Type-safe routing and IDs
export * from "./hsx-types.ts";

// HSX Component and Page
export {
  hsxComponent,
  type HsxComponent,
  type HsxComponentOptions,
  type HttpMethod,
} from "./hsx-component.ts";
export { hsxPage, type HsxPage } from "./hsx-page.ts";
