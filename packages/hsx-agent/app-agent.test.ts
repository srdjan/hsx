/**
 * Tests for createAppAgent: the loop that lets an AI drive real hsxComponents.
 *
 * Uses an in-memory fake AIProvider (a scripted async generator) so the loop
 * logic is covered without any network or API key.
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "@srdjan/hsx";
import { jsx } from "hsx/jsx-runtime";
import type { AIProvider, Message } from "@srdjan/hsx-genui";
import { createAppAgent } from "./app-agent.ts";

const addTodoSchema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

/** A todos component backed by a closure store, for end-to-end loop tests. */
function makeAddTodo(store: string[]) {
  return hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo item.",
    input: { schema: addTodoSchema },
    async handler(req) {
      const form = await req.formData();
      store.push(String(form.get("text")));
      return { todos: [...store] };
    },
    render: ({ todos }: { todos: string[] }) =>
      jsx("ul", {
        id: "todo-list",
        children: todos.map((t) => jsx("li", { children: t })),
      }),
  });
}

Deno.test("createAppAgent exposes tool definitions for agent components", () => {
  const AddTodo = makeAddTodo([]);
  const provider: AIProvider = {
    // deno-lint-ignore require-yield
    async *stream() {
      return;
    },
  };

  const agent = createAppAgent({ components: [AddTodo], provider });

  assertEquals(agent.tools.map((t) => t.name), ["post_todos"]);
});

Deno.test("createAppAgent runs the real component and streams + feeds back its HTML", async () => {
  const store: string[] = [];
  const AddTodo = makeAddTodo(store);

  const turns: Message[][] = [];
  const provider: AIProvider = {
    async *stream(messages, _tools) {
      turns.push([...messages]);
      if (turns.length === 1) {
        yield {
          tag: "tool_call",
          call: { id: "t1", name: "post_todos", arguments: { text: "milk" } },
        };
        yield { tag: "done" };
      } else {
        yield { tag: "text", content: "Added milk to your list." };
        yield { tag: "done" };
      }
    },
  };

  const agent = createAppAgent({ components: [AddTodo], provider });
  const res = agent.handleMessage("add milk", []);
  const body = await res.text();

  // The real component handler ran.
  assertEquals(store, ["milk"]);
  // The rendered list HTML was streamed to the browser.
  assertStringIncludes(body, `<ul id="todo-list">`);
  assertStringIncludes(body, "<li>milk</li>");
  // The follow-up assistant text was streamed.
  assertStringIncludes(body, "Added milk to your list.");
  // The model's tool_result carried the real rendered HTML as its observation.
  const secondTurn = turns[1];
  const toolResult = secondTurn.find((m) => m.role === "tool_result");
  assertExists(toolResult);
  assertStringIncludes(
    toolResult.role === "tool_result" ? toolResult.content : "",
    "<li>milk</li>",
  );
});

Deno.test("createAppAgent surfaces an unknown tool as an error without crashing", async () => {
  const provider: AIProvider = {
    async *stream() {
      yield {
        tag: "tool_call",
        call: { id: "x", name: "no_such_tool", arguments: {} },
      };
      yield { tag: "done" };
    },
  };

  const agent = createAppAgent({ components: [], provider, maxTurns: 2 });
  const res = agent.handleMessage("hi", []);
  const body = await res.text();

  assertStringIncludes(body, "no_such_tool");
});
