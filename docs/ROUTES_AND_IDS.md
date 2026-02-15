# Routes and Branded IDs

HSX provides small helper types for making your templates less
stringly-typed.

## Routes

A `Route` describes an HTTP path and how to build it from parameters:

```ts
export type Route<Path extends string, Params> = {
  path: Path;
  build: (params: Params) => string;
};
```

You can use `route()` to build these:

```ts
import { route } from "jsr:@srdjan/hsx";

export const routes = {
  todos: {
    list: route("/todos", () => "/todos"),
    detail: route("/todos/:id", (p: { id: number }) => `/todos/${p.id}`),
  },
};
```

HSX attributes like `get` and `post` accept either raw strings or
`Route<string, Params>` values. During SSR, HSX resolves them into final
URLs using `build(params)` when provided.

## Branded IDs

Element IDs can be created via `id(name)`:

```ts
import { id } from "jsr:@srdjan/hsx";

export const ids = {
  list: id("todo-list"),
  detail: id("todo-detail"),
};
```

These are runtime strings (e.g. `"#todo-list"`), but branded types at
compile time. HSX attributes like `target` accept `Id<string> | string`,
so you can catch typos earlier and share IDs across templates.
