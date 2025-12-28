/**
 * HSX - SSR-only JSX/TSX renderer for HTMX applications.
 *
 * HSX lets you write HTMX-style attributes (`get`, `post`, `target`, `swap`)
 * as if they were native HTML, then compiles them to `hx-*` attributes on the server.
 *
 * This is the main entry point that exports everything. For tree-shaking, use:
 * - `@srdjan/hsx/core` - render, route, id, Fragment (smaller bundle)
 * - `@srdjan/hsx/components` - hsxComponent, hsxPage only
 *
 * @example
 * ```tsx
 * import { render, route, id, hsxComponent } from "@srdjan/hsx";
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

// Re-export everything from core and components
export * from "./core.ts";
export * from "./components.ts";
