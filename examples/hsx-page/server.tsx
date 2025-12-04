/** @jsxImportSource hsx */
import { hsxComponent, hsxPage, id, render } from "../../src/index.ts";

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
      <style>
        {`
:root { --bg: #0b1021; --surface: #11172d; --text: #e6edf7; --muted: #9fb1d0; --accent: #6ee7ff; }
* { box-sizing: border-box; }
body { font-family: "Inter", system-ui, -apple-system, sans-serif; background: radial-gradient(circle at 20% 20%, #122040 0, #0b1021 40%), #0b1021; color: var(--text); margin: 0; min-height: 100vh; }
.shell { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 3.5rem; }
.card { background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 1.5rem; box-shadow: 0 20px 50px rgba(0,0,0,0.35); }
h2 { margin: 0 0 1rem; font-weight: 600; }
form { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
input[type="text"] { flex: 1; padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: var(--text); }
button { padding: 0.65rem 1rem; border-radius: 10px; border: none; background: var(--accent); color: #0b1021; font-weight: 700; cursor: pointer; box-shadow: 0 10px 30px rgba(110,231,255,0.25); }
button:hover { transform: translateY(-1px); }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
li { padding: 0.65rem 0.75rem; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
label { display: flex; gap: 0.5rem; align-items: center; }
footer { margin-top: 2rem; color: var(--muted); }
        `}
      </style>
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
