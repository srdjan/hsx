/**
 * Todos Components
 *
 * Demonstrates hsxComponent pattern with type-safe co-located routes,
 * handlers, and render functions.
 */
import { hsxComponent } from "@srdjan/hsx";
import { id } from "@srdjan/hsx";

// =============================================================================
// Types & Shared State
// =============================================================================

export type Todo = { id: number; text: string; done: boolean };
export type Filter = "all" | "active" | "completed";
export type ViewState = { items: Todo[]; filter: Filter };

export const ids = {
  app: id("todo-app"),
  list: id("todo-list"),
  count: id("todo-count"),
  filters: id("todo-filters"),
  clearCompleted: id("clear-completed"),
};

// In-memory data store
export const todos: Todo[] = [
  { id: 1, text: "Learn HSX JSX renderer", done: true },
  { id: 2, text: "Build something with HTMX", done: false },
  { id: 3, text: "Deploy to production", done: false },
];

let nextId = 4;

// =============================================================================
// Helpers
// =============================================================================

export function parseFilter(url: URL): Filter {
  const f = url.searchParams.get("filter");
  if (f === "active" || f === "completed") return f;
  return "all";
}

function view(filter: Filter): ViewState {
  return { items: [...todos], filter };
}

// =============================================================================
// View Components
// =============================================================================

function TodoItem(props: { todo: Todo }) {
  const { todo } = props;
  const inputId = `todo-${todo.id}`;

  return (
    <li>
      <input
        type="checkbox"
        id={inputId}
        checked={todo.done}
        post={TodoToggle}
        params={{ id: todo.id }}
        target={ids.app}
        swap="innerHTML"
        trigger="change"
      />
      <label htmlFor={inputId}>{todo.text}</label>
      <button
        type="button"
        post={TodoDelete}
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

function TodoListView(props: ViewState) {
  const { items, filter } = props;

  const filtered = items.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });

  return (
    <ul id="todo-list">
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
    <span id="todo-count" data-count={String(active)}>
      <strong>{active}</strong> {word} left
    </span>
  );
}

function TodoFilters(props: { current: Filter }) {
  const { current } = props;
  const filters: Filter[] = ["all", "active", "completed"];

  return (
    <nav id="todo-filters" aria-label="Filter todos">
      {filters.map((f) => (
        <button
          type="button"
          get={TodoList}
          target={ids.app}
          swap="innerHTML"
          vals={{ filter: f }}
          aria-pressed={f === current ? "true" : "false"}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </nav>
  );
}

function ClearCompleted(props: { items: Todo[] }) {
  const hasCompleted = props.items.some((t) => t.done);
  return (
    <button
      type="button"
      id="clear-completed"
      post={TodoClear}
      target={ids.app}
      swap="innerHTML"
      disabled={!hasCompleted}
    >
      Clear completed
    </button>
  );
}

export function TodoApp(props: ViewState) {
  const { items, filter } = props;
  return (
    <section id="todo-app" aria-label="Todo list">
      <form post={TodoList} target={ids.app} swap="innerHTML">
        <input
          type="text"
          name="text"
          placeholder="What needs to be done?"
          required
          autofocus
        />
        <button type="submit">Add</button>
      </form>

      <TodoListView items={items} filter={filter} />

      {items.length > 0 && (
        <footer>
          <TodoCount items={items} />
          <TodoFilters current={filter} />
          <ClearCompleted items={items} />
        </footer>
      )}
    </section>
  );
}

// =============================================================================
// HSX Components - Co-located route + handler + render
// =============================================================================

export const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"],
  async handler(req) {
    const url = new URL(req.url);
    const filter = parseFilter(url);

    if (req.method === "POST") {
      const form = await req.formData();
      const text = String(form.get("text") ?? "").trim();
      if (text.length > 0) {
        todos.push({ id: nextId++, text, done: false });
      }
    }

    return view(filter);
  },
  render: TodoApp,
});

export const TodoToggle = hsxComponent("/todos/:id/toggle", {
  methods: ["POST"],
  handler(_req, params) {
    const id = Number(params.id);
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.done = !todo.done;
    return view("all");
  },
  render: TodoApp,
});

export const TodoDelete = hsxComponent("/todos/:id/delete", {
  methods: ["POST"],
  handler(_req, params) {
    const id = Number(params.id);
    const idx = todos.findIndex((t) => t.id === id);
    if (idx !== -1) todos.splice(idx, 1);
    return view("all");
  },
  render: TodoApp,
});

export const TodoClear = hsxComponent("/todos/clear-completed", {
  methods: ["POST"],
  handler() {
    const active = todos.filter((t) => !t.done);
    todos.length = 0;
    todos.push(...active);
    return view("all");
  },
  render: TodoApp,
});
