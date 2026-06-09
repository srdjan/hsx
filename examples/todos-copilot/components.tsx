/**
 * Todos Copilot - components.
 *
 * The same hsxComponents serve two consumers: a human over HTMX, and an AI
 * agent over tool-calls. The mutating components declare `describe` + `input`,
 * which is the only thing that makes them agent-callable.
 *
 * Each mutation renders the todo list with `swapOob`, so whether the change
 * came from the human add-form (swap="none") or from the agent's SSE stream,
 * the canonical `#todo-list` updates out-of-band. The agent's text narration
 * lands in the chat; the list moves in its own column.
 */

import { hsxComponent } from "@srdjan/hsx";
import type { Renderable } from "@srdjan/hsx";

// =============================================================================
// In-memory domain (module state, like the todos example)
// =============================================================================

type Todo = { id: string; text: string; done: boolean };

let nextId = 1;
export const todos: Todo[] = [];

function addTodo(text: string): void {
  const trimmed = text.trim();
  if (trimmed) todos.push({ id: String(nextId++), text: trimmed, done: false });
}

function toggleTodo(id: string): void {
  const todo = todos.find((t) => t.id === id);
  if (todo) todo.done = !todo.done;
}

function clearDone(): void {
  for (let i = todos.length - 1; i >= 0; i--) {
    if (todos[i].done) todos.splice(i, 1);
  }
}

// =============================================================================
// Input guards (read `unknown` without `any` or assertions)
// =============================================================================

function readString(raw: unknown, key: string): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const value: unknown = Reflect.get(raw, key);
  return typeof value === "string" ? value : undefined;
}

function assertText(raw: unknown): void {
  const text = readString(raw, "text");
  if (!text || !text.trim()) {
    throw new Error("A non-empty 'text' field is required.");
  }
}

function assertId(raw: unknown): void {
  if (!readString(raw, "id")) throw new Error("An 'id' field is required.");
}

// =============================================================================
// View - the canonical list, always rendered as an out-of-band swap
// =============================================================================

export function TodoListView(): Renderable {
  return (
    <ul id="todo-list" swapOob="true">
      {todos.length === 0
        ? <li data-empty="true">No todos yet. Add one, or ask the copilot.</li>
        : todos.map((t) => (
          <li data-done={t.done ? "true" : undefined}>
            <button
              type="button"
              class="toggle"
              post={ToggleTodo.build({ id: t.id })}
              swap="none"
            >
              toggle
            </button>
            <span class="text">{t.text}</span>
          </li>
        ))}
    </ul>
  );
}

// =============================================================================
// Agent-callable mutations (describe + input => exposed as AI tools)
// =============================================================================

export const AddTodo = hsxComponent("/todos", {
  methods: ["POST"],
  agentName: "add_todo",
  describe: "Add a new todo item to the list.",
  input: {
    schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The todo text to add." },
      },
      required: ["text"],
    },
    assert: assertText,
  },
  async handler(req) {
    const form = await req.formData();
    addTodo(String(form.get("text") ?? ""));
    return {};
  },
  render: () => <TodoListView />,
});

export const ToggleTodo = hsxComponent("/todos/:id/toggle", {
  methods: ["POST"],
  agentName: "toggle_todo",
  describe: "Toggle a todo between done and not-done by its id.",
  input: {
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The id of the todo to toggle." },
      },
      required: ["id"],
    },
    assert: assertId,
  },
  handler(_req, params) {
    toggleTodo(String(params.id));
    return {};
  },
  render: () => <TodoListView />,
});

export const ClearDone = hsxComponent("/todos/clear", {
  methods: ["POST"],
  agentName: "clear_done",
  describe: "Remove every todo that is marked done.",
  input: { schema: { type: "object", properties: {} }, assert: () => {} },
  handler() {
    clearDone();
    return {};
  },
  render: () => <TodoListView />,
});

export const todoComponents = [AddTodo, ToggleTodo, ClearDone];

// =============================================================================
// Chat panel (embedded in the page; backend wired by createGenUIRoutes)
// =============================================================================

export function CopilotPanel(): Renderable {
  return (
    <div class="copilot">
      <h2>Copilot</h2>
      <p>Try: "add milk and eggs, then mark the first one done"</p>
      <div id="genui-messages" class="messages"></div>
      <form
        class="copilot-form"
        post="/copilot/send"
        target="#genui-messages"
        swap="beforeend"
      >
        <input
          class="copilot-input"
          type="text"
          name="message"
          placeholder="Ask the copilot..."
          autocomplete="off"
        />
        <button class="copilot-send" type="submit">Send</button>
      </form>
    </div>
  );
}
