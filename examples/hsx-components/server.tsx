/**
 * HSX Component Example
 *
 * Demonstrates the hsxComponent pattern where route, handler, and
 * component are co-located in a single definition with type-safe
 * enforcement between handler output and component props.
 */
import { hsxComponent, hsxPage, id } from "../../src/index.ts";

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
  app: id("todo-app"),
  list: id("todo-list"),
};

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root { --accent: #4f46e5; --bg: #f8fafc; --surface: #fff; --border: #e2e8f0; --text: #1e293b; --muted: #64748b; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 32rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 1.5rem; color: var(--muted); }
.card { background: var(--surface); border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
input[type="text"] { flex: 1; padding: 0.5rem; border: 2px solid var(--border); border-radius: 4px; font-size: 1rem; }
input[type="text"]:focus { outline: none; border-color: var(--accent); }
button { padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
button:hover { opacity: 0.9; }
ul { list-style: none; }
li { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
li:last-child { border-bottom: none; }
.done { text-decoration: line-through; color: var(--muted); }
.toggle { width: 1.25rem; height: 1.25rem; cursor: pointer; }
.delete { margin-left: auto; color: var(--muted); background: none; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
.delete:hover { color: #ef4444; }
.count { margin-top: 1rem; font-size: 0.875rem; color: var(--muted); text-align: center; }
`;

// =============================================================================
// HSX Components - Each co-locates route + handler + render
// =============================================================================

/**
 * TodoList component - handles GET (list) and POST (add)
 *
 * The handler return type { todos: Todo[] } is enforced to match
 * the render function's props. TypeScript will error if they mismatch.
 */
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
        <ul id="todo-list">
          {todos.map((t) => (
            <li>
              <input
                type="checkbox"
                class="toggle"
                checked={t.done}
                post={TodoToggle}
                params={{ id: t.id }}
                target={ids.list}
                swap="outerHTML"
              />
              <span class={t.done ? "done" : ""}>{t.text}</span>
              <button
                class="delete"
                delete={TodoDelete}
                params={{ id: t.id }}
                target={ids.list}
                swap="outerHTML"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div class="count">
          {remaining} item{remaining !== 1 ? "s" : ""} left
        </div>
      </>
    );
  },
});

/**
 * TodoToggle component - handles POST to toggle a todo's done state
 */
const TodoToggle = hsxComponent("/todos/:id/toggle", {
  methods: ["POST"],

  handler(_req, params) {
    const todo = todos.find((t) => t.id === Number(params.id));
    if (todo) todo.done = !todo.done;
    return { todos: [...todos] };
  },

  render: TodoList.Component, // Reuse TodoList's render!
});

/**
 * TodoDelete component - handles DELETE to remove a todo
 */
const TodoDelete = hsxComponent("/todos/:id", {
  methods: ["DELETE"],

  handler(_req, params) {
    const idx = todos.findIndex((t) => t.id === Number(params.id));
    if (idx !== -1) todos.splice(idx, 1);
    return { todos: [...todos] };
  },

  render: TodoList.Component, // Reuse TodoList's render!
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
      <style>{styles}</style>
    </head>
    <body>
      <main>
        <h1>HSX Components Demo</h1>
        <div class="card">
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

// All HSX components in this app
const components = [TodoList, TodoToggle, TodoDelete];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  // Favicon
  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // HTMX script
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

  // Main page
  if (pathname === "/") {
    return Page.render();
  }

  // Try HSX Components - automatic routing!
  for (const component of components) {
    const method = req.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    if (component.match(pathname) && component.methods.includes(method)) {
      return component.handle(req);
    }
  }

  return new Response("Not Found", { status: 404 });
});
