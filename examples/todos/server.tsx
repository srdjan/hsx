import { render } from "../../src/index.ts";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

type Todo = { id: number; text: string; done: boolean };

const todos: Todo[] = [
  { id: 1, text: "Try HSX SSR renderer", done: false },
  { id: 2, text: "Wire HTMX partials", done: false },
];

function TodoList(props: { items: Todo[] }) {
  return (
    <ul id="todo-list">
      {props.items.map((t) => (
        <li>
          <label>
            <input type="checkbox" checked={t.done} disabled /> {t.text}
          </label>
        </li>
      ))}
    </ul>
  );
}

function Page() {
  return (
    <html>
      <head>
        <title>HSX Todos</title>
        <meta charSet="utf-8" />
      </head>
      <body>
        <h1>Todos</h1>

        <form
          post={routes.todos.list}
          target={ids.list}
          swap="outerHTML"
          headers={{ "X-Flow-Id": "todos-example" }}
        >
          <input
            type="text"
            name="text"
            placeholder="New todo"
            required
          />
          <button type="submit">Add</button>
        </form>

        <button
          type="button"
          get={routes.todos.list}
          target={ids.list}
          swap="outerHTML"
          vals={{ status: "all" }}
        >
          Refresh
        </button>

        <TodoList items={todos} />
      </body>
    </html>
  );
}

async function handleTodos(req: Request): Promise<Response> {
  if (req.method === "POST") {
    const form = await req.formData();
    const text = String(form.get("text") ?? "").trim();
    if (text.length > 0) {
      const id = (todos.at(-1)?.id ?? 0) + 1;
      todos.push({ id, text, done: false });
    }
  }
  const html = render(<TodoList items={todos} />).body;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/favicon.ico") {
    // Silence browser favicon fetch; no icon bundled.
    return new Response(null, { status: 204 });
  }

  if (url.pathname === "/") {
    return render(<Page />);
  }

  if (url.pathname === "/todos") {
    return handleTodos(req);
  }

  if (url.pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response(
        "// htmx.js not found – copy HTMX v4 build into vendor/htmx/htmx.js\n",
        {
          status: 500,
          headers: { "content-type": "text/javascript; charset=utf-8" },
        },
      );
    }
  }

  return new Response("Not found", { status: 404 });
});
