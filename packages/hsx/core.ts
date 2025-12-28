/**
 * HSX Core - Minimal entry point for tree-shaking.
 *
 * Use this when you only need the low-level API (render, route, id)
 * without hsxComponent/hsxPage for smaller bundles.
 *
 * @example
 * ```tsx
 * import { render, route, id, Fragment } from "@srdjan/hsx/core";
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
