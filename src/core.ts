/**
 * HSX Core - Foundation module for SSR rendering.
 *
 * This module provides the core rendering functionality without higher-level
 * abstractions like `hsxComponent` or `hsxPage`. Use this for lightweight
 * JSX-to-HTML rendering with type-safe routes.
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

// Type-safe routing
export * from "./hsx-types.ts";
