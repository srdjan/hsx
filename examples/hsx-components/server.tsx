/**
 * HSX Component Example
 *
 * Demonstrates the hsxComponent pattern where route, handler, and
 * component are co-located in a single definition with type-safe
 * enforcement between handler output and component props.
 */
import { hsxComponent, hsxPage } from "@srdjan/hsx";
import { id } from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";

// =============================================================================
// Types & Data
// =============================================================================

type Todo = { id: number; text: string; done: boolean };

const todos: Todo[] = [
  { id: 1, text: "Learn HSX Components", done: true },
  { id: 2, text: "Build something awesome", done: false },
  { id: 3, text: "Ship to production", done: false },
];

let nextId = 4;

const ids = {
  list: id("todo-list"),
};

// =============================================================================
// HSX Components - Each co-locates route + handler + render
// =============================================================================

const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"],

  async handler(req) {
    if (req.method === "POST") {
      const form = await req.formData();
      const text = String(form.get("text") ?? "").trim();
      if (text) {
        todos.push({ id: nextId++, text, done: false });
      }
    }
    return { todos: [...todos] };
  },

  render({ todos }) {
    const remaining = todos.filter((t) => !t.done).length;
    return (
      <>
        <ul id="todo-list" data-layout="stack" data-gap="2">
          {todos.map((t) => (
            <li
              data-layout="row"
              data-align="center"
              data-justify="between"
              data-gap="3"
            >
              <label data-layout="row" data-align="center" data-gap="3">
                <input
                  type="checkbox"
                  checked={t.done}
                  post={TodoToggle}
                  params={{ id: t.id }}
                  target={ids.list}
                  swap="outerHTML"
                />
                {t.done ? <s>{t.text}</s> : <span>{t.text}</span>}
              </label>
              <button
                type="button"
                data-variant="ghost"
                delete={TodoDelete}
                params={{ id: t.id }}
                target={ids.list}
                swap="outerHTML"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <p>
          {remaining} item{remaining !== 1 ? "s" : ""} left
        </p>
      </>
    );
  },
});

const TodoToggle = hsxComponent("/todos/:id/toggle", {
  methods: ["POST"],
  handler(_req, params) {
    const todo = todos.find((t) => t.id === Number(params.id));
    if (todo) todo.done = !todo.done;
    return { todos: [...todos] };
  },
  render: TodoList.Component,
});

const TodoDelete = hsxComponent("/todos/:id", {
  methods: ["DELETE"],
  handler(_req, params) {
    const idx = todos.findIndex((t) => t.id === Number(params.id));
    if (idx !== -1) todos.splice(idx, 1);
    return { todos: [...todos] };
  },
  render: TodoList.Component,
});

// =============================================================================
// Page Layout
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HSX Components Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <main data-layout="container stack" data-gap="6">
        <h1>HSX Components Demo</h1>
        <div data-surface="card" data-layout="stack" data-gap="4">
          <form post={TodoList} target={ids.list} swap="outerHTML">
            <input
              type="text"
              name="text"
              placeholder="What needs to be done?"
              required
            />
            <button type="submit">Add</button>
          </form>
          <TodoList.Component todos={todos} />
        </div>
      </main>
    </body>
  </html>
));

// =============================================================================
// Server - Route matching using HSX Components
// =============================================================================

const components = [TodoList, TodoToggle, TodoDelete];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  if (pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response("// htmx.js not found", {
        status: 500,
        headers: { "content-type": "text/javascript" },
      });
    }
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  if (pathname === "/") {
    return Page.render();
  }

  for (const component of components) {
    const method = req.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    if (component.match(pathname) && component.methods.includes(method)) {
      return component.handle(req);
    }
  }

  return new Response("Not Found", { status: 404 });
});
