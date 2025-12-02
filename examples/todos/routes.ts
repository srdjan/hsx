import { route } from "../../src/hsx-types.ts";

export const routes = {
  todos: {
    list: route("/todos", () => "/todos"),
    toggle: route("/todos/:id/toggle", (p) => `/todos/${p.id}/toggle`),
    delete: route("/todos/:id/delete", (p) => `/todos/${p.id}/delete`),
    clearCompleted: route("/todos/clear-completed", () => "/todos/clear-completed"),
  },
};

export type Routes = typeof routes;
