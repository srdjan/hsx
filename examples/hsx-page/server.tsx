import { hsxComponent, hsxPage, id, render } from "../../src/index.ts";
import { hsxStylesDark, HSX_STYLES_PATH } from "../../src/styles.ts";

// ---------------------------------------------------------------------------
// Data (in-memory for demo)
// ---------------------------------------------------------------------------

type Todo = { id: number; text: string; done: boolean };

const todos: Todo[] = [
  { id: 1, text: "Ship hsxPage", done: false },
  { id: 2, text: "Enforce semantic layouts", done: true },
];

let nextId = 3;

const ids = {
  list: id("todo-list"),
};

// ---------------------------------------------------------------------------
// HSX Components (used inside the page)
// ---------------------------------------------------------------------------

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
    return (
      <ul id="todo-list">
        {todos.map((t) => (
          <li>
            <label>
              <input type="checkbox" checked={t.done} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
    );
  },
});

// ---------------------------------------------------------------------------
// Page (enforced by hsxPage)
// ---------------------------------------------------------------------------

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>hsxPage Demo</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <div class="shell">
        <header>
          <h1>hsxPage</h1>
          <p>Semantic layout + CSS in &lt;style&gt; + HSX components.</p>
        </header>
        <main>
          <section>
            <div class="card">
              <h2>Todos</h2>
              <form post={TodoList} target={ids.list} swap="outerHTML">
                <input
                  type="text"
                  name="text"
                  placeholder="Add a task"
                  required
                />
                <button type="submit">Add</button>
              </form>
              <TodoList.Component todos={todos} />
            </div>
          </section>
        </main>
        <footer>
          <small>hsxPage enforces semantic structure and clean styling.</small>
        </footer>
      </div>
    </body>
  </html>
));

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/static/htmx.js") {
    const js = await Deno.readTextFile(
      new URL("../../vendor/htmx/htmx.js", import.meta.url),
    );
    return new Response(js, {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStylesDark, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  if (pathname === "/") {
    return Page.render();
  }

  if (
    pathname === TodoList.path &&
    TodoList.methods.includes(req.method as typeof TodoList.methods[number])
  ) {
    return TodoList.handle(req);
  }

  return new Response("Not Found", { status: 404 });
});
