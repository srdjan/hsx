import { route } from "../../src/hsx-types.ts";

export const routes = {
  todos: {
    list: route("/todos", () => "/todos"),
    detail: route(
      "/todos/:id",
      (p: { id: string | number }) => `/todos/${p.id}`,
    ),
  },
};

export type Routes = typeof routes;
