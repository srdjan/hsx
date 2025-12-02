import { render, renderHtml } from "../../src/index.ts";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

// =============================================================================
// Types & Data
// =============================================================================

type Todo = { id: number; text: string; done: boolean };
type Filter = "all" | "active" | "completed";

const todos: Todo[] = [
  { id: 1, text: "Learn HSX JSX renderer", done: true },
  { id: 2, text: "Build something with HTMX", done: false },
  { id: 3, text: "Deploy to production", done: false },
];

let nextId = 4;

// =============================================================================
// CSS Styles (Modern CSS with layers, custom properties, modern selectors)
// =============================================================================

const styles = `
@layer reset, tokens, base, components, utilities;

@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}

@layer tokens {
  :root {
    /* Colors - warm neutral palette */
    --color-bg: #faf9f7;
    --color-surface: #ffffff;
    --color-border: #e8e6e3;
    --color-border-focus: #8b7355;
    --color-text: #2d2926;
    --color-text-muted: #6b6560;
    --color-text-placeholder: #a19d98;
    --color-accent: #8b7355;
    --color-accent-hover: #6d5a44;
    --color-danger: #c45c5c;
    --color-danger-hover: #a34848;
    --color-success: #5c8b6b;

    /* Spacing scale */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;

    /* Typography */
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-size-sm: clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem);
    --font-size-base: clamp(0.95rem, 0.9rem + 0.25vw, 1rem);
    --font-size-lg: clamp(1.1rem, 1rem + 0.5vw, 1.25rem);
    --font-size-xl: clamp(1.5rem, 1.25rem + 1vw, 2rem);

    /* Borders & Shadows */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
  }
}

@layer base {
  html {
    font-family: var(--font-sans);
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--color-text);
    background: var(--color-bg);
    -webkit-font-smoothing: antialiased;
  }

  body {
    min-block-size: 100dvh;
    padding-block: var(--space-xl);
    padding-inline: var(--space-md);
  }

  ::selection {
    background: var(--color-accent);
    color: white;
  }

  :focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }
}

@layer components {
  /* App Container */
  .todo-app {
    max-inline-size: 32rem;
    margin-inline: auto;
  }

  /* Header */
  .todo-header {
    text-align: center;
    margin-block-end: var(--space-xl);
  }

  .todo-title {
    font-size: var(--font-size-xl);
    font-weight: 300;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    text-transform: lowercase;
  }

  /* Main Card */
  .todo-card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }

  /* Input Form */
  .todo-form {
    display: flex;
    border-block-end: 1px solid var(--color-border);
  }

  .todo-input {
    flex: 1;
    padding: var(--space-md) var(--space-lg);
    font: inherit;
    font-size: var(--font-size-lg);
    border: none;
    background: transparent;
  }

  .todo-input::placeholder {
    color: var(--color-text-placeholder);
    font-style: italic;
  }

  .todo-input:focus {
    outline: none;
    background: rgba(139, 115, 85, 0.03);
  }

  .todo-submit {
    padding: var(--space-md) var(--space-lg);
    font: inherit;
    font-weight: 500;
    color: var(--color-accent);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .todo-submit:hover {
    background: rgba(139, 115, 85, 0.08);
  }

  /* Todo List */
  .todo-list {
    list-style: none;
  }

  .todo-list:empty::before {
    content: "No todos yet. Add one above!";
    display: block;
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Todo Item */
  .todo-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-block-end: 1px solid var(--color-border);
    transition: background var(--transition-fast);
  }

  .todo-item:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .todo-item:last-child {
    border-block-end: none;
  }

  /* Checkbox */
  .todo-checkbox {
    appearance: none;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border: 2px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .todo-checkbox:hover {
    border-color: var(--color-accent);
  }

  .todo-checkbox:checked {
    background: var(--color-success);
    border-color: var(--color-success);
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
    background-size: 80%;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* Todo Text */
  .todo-text {
    flex: 1;
    font-size: var(--font-size-base);
    transition: all var(--transition-fast);
  }

  .todo-item:has(.todo-checkbox:checked) .todo-text {
    color: var(--color-text-muted);
    text-decoration: line-through;
    text-decoration-color: var(--color-border);
  }

  /* Delete Button */
  .todo-delete {
    opacity: 0;
    padding: var(--space-xs) var(--space-sm);
    font: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-danger);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .todo-item:hover .todo-delete,
  .todo-delete:focus-visible {
    opacity: 1;
  }

  .todo-delete:hover {
    background: rgba(196, 92, 92, 0.1);
  }

  /* Footer */
  .todo-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: rgba(0, 0, 0, 0.02);
  }

  /* Count */
  .todo-count {
    font-variant-numeric: tabular-nums;
  }

  .todo-count strong {
    font-weight: 600;
    color: var(--color-text);
  }

  /* Filters */
  .todo-filters {
    display: flex;
    gap: var(--space-xs);
  }

  .filter-btn {
    padding: var(--space-xs) var(--space-sm);
    font: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .filter-btn:hover {
    border-color: var(--color-border);
  }

  .filter-btn[aria-pressed="true"] {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* Clear Completed */
  .clear-btn {
    padding: var(--space-xs) var(--space-sm);
    font: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .clear-btn:hover {
    color: var(--color-danger);
  }

  .clear-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Empty state when all completed */
  .todo-list:has(.todo-checkbox:checked):not(:has(.todo-checkbox:not(:checked))) + .todo-footer .todo-count::after {
    content: " - All done!";
    color: var(--color-success);
  }
}

@layer utilities {
  .visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
`;

// =============================================================================
// Components
// =============================================================================

function TodoItem(props: { todo: Todo }) {
  const { todo } = props;
  return (
    <li class="todo-item">
      <input
        type="checkbox"
        class="todo-checkbox"
        checked={todo.done}
        post={routes.todos.toggle}
        params={{ id: todo.id }}
        target={ids.app}
        swap="innerHTML"
        trigger="change"
        aria-label={`Mark "${todo.text}" as ${todo.done ? "not done" : "done"}`}
      />
      <span class="todo-text">{todo.text}</span>
      <button
        type="button"
        class="todo-delete"
        post={routes.todos.delete}
        params={{ id: todo.id }}
        target={ids.app}
        swap="innerHTML"
        aria-label={`Delete "${todo.text}"`}
      >
        delete
      </button>
    </li>
  );
}

function TodoList(props: { items: Todo[]; filter: Filter }) {
  const { items, filter } = props;

  const filtered = items.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });

  return (
    <ul id="todo-list" class="todo-list">
      {filtered.map((t) => (
        <TodoItem todo={t} />
      ))}
    </ul>
  );
}

function TodoCount(props: { items: Todo[] }) {
  const active = props.items.filter((t) => !t.done).length;
  const word = active === 1 ? "item" : "items";
  return (
    <span id="todo-count" class="todo-count">
      <strong>{active}</strong> {word} left
    </span>
  );
}

function TodoFilters(props: { current: Filter }) {
  const { current } = props;
  const filters: Filter[] = ["all", "active", "completed"];

  return (
    <div id="todo-filters" class="todo-filters" role="group" aria-label="Filter todos">
      {filters.map((f) => (
        <button
          type="button"
          class="filter-btn"
          get={routes.todos.list}
          target={ids.app}
          swap="innerHTML"
          vals={{ filter: f }}
          aria-pressed={f === current ? "true" : "false"}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ClearCompleted(props: { items: Todo[] }) {
  const hasCompleted = props.items.some((t) => t.done);
  return (
    <button
      type="button"
      id="clear-completed"
      class="clear-btn"
      post={routes.todos.clearCompleted}
      target={ids.app}
      swap="innerHTML"
      disabled={!hasCompleted}
    >
      Clear completed
    </button>
  );
}

function TodoApp(props: { items: Todo[]; filter: Filter }) {
  const { items, filter } = props;
  return (
    <>
      <form
        class="todo-form"
        post={routes.todos.list}
        target={ids.app}
        swap="innerHTML"
      >
        <input
          type="text"
          name="text"
          class="todo-input"
          placeholder="What needs to be done?"
          required
          autofocus
        />
        <button type="submit" class="todo-submit">Add</button>
      </form>

      <TodoList items={items} filter={filter} />

      {items.length > 0 && (
        <footer class="todo-footer">
          <TodoCount items={items} />
          <TodoFilters current={filter} />
          <ClearCompleted items={items} />
        </footer>
      )}
    </>
  );
}

function Page(props: { filter: Filter }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Todos - HSX Example</title>
        <style>{styles}</style>
      </head>
      <body>
        <main class="todo-app">
          <header class="todo-header">
            <h1 class="todo-title">todos</h1>
          </header>

          <section class="todo-card" id="todo-app" aria-label="Todo list">
            <TodoApp items={todos} filter={props.filter} />
          </section>
        </main>
      </body>
    </html>
  );
}

// =============================================================================
// Request Handlers
// =============================================================================

function parseFilter(url: URL): Filter {
  const f = url.searchParams.get("filter");
  if (f === "active" || f === "completed") return f;
  return "all";
}

function parseId(pathname: string): number | null {
  const match = pathname.match(/\/todos\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
}

async function handleTodos(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const filter = parseFilter(url);

  if (req.method === "POST") {
    const form = await req.formData();
    const text = String(form.get("text") ?? "").trim();
    if (text.length > 0) {
      todos.push({ id: nextId++, text, done: false });
    }
  }

  const html = renderHtml(<TodoApp items={todos} filter={filter} />);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function handleToggle(id: number): Response {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.done = !todo.done;
  }
  const html = renderHtml(<TodoApp items={todos} filter="all" />);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function handleDelete(id: number): Response {
  const idx = todos.findIndex((t) => t.id === id);
  if (idx !== -1) {
    todos.splice(idx, 1);
  }
  const html = renderHtml(<TodoApp items={todos} filter="all" />);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function handleClearCompleted(): Response {
  const active = todos.filter((t) => !t.done);
  todos.length = 0;
  todos.push(...active);
  const html = renderHtml(<TodoApp items={todos} filter="all" />);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  // Favicon
  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // Main page
  if (pathname === "/") {
    return render(<Page filter="all" />);
  }

  // Todo list (GET for refresh/filter, POST for add)
  if (pathname === "/todos") {
    return handleTodos(req);
  }

  // Toggle todo
  if (pathname.match(/^\/todos\/\d+\/toggle$/)) {
    const id = parseId(pathname);
    if (id !== null) return handleToggle(id);
  }

  // Delete todo
  if (pathname.match(/^\/todos\/\d+\/delete$/)) {
    const id = parseId(pathname);
    if (id !== null) return handleDelete(id);
  }

  // Clear completed
  if (pathname === "/todos/clear-completed") {
    return handleClearCompleted();
  }

  // HTMX library
  if (pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response(
        "// htmx.js not found - copy HTMX v2 into vendor/htmx/htmx.js\n",
        {
          status: 500,
          headers: { "content-type": "text/javascript; charset=utf-8" },
        },
      );
    }
  }

  return new Response("Not found", { status: 404 });
});
