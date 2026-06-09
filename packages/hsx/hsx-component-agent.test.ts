/**
 * Unit tests for the agent descriptor on HSX Components.
 *
 * A component becomes agent-callable only when it declares both `describe`
 * and `input`. The derived `.agent` descriptor is what `componentsToTools`
 * (in @srdjan/hsx-agent) reads to build AI tool definitions.
 *
 * Run with: deno test --allow-read packages/hsx/hsx-component-agent.test.ts
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "./hsx-component.ts";
import { jsx } from "./jsx-runtime.ts";

const objectSchema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

Deno.test("agent descriptor is present when describe and input are both set", () => {
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a new todo item.",
    input: { schema: objectSchema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  assertExists(AddTodo.agent);
  assertEquals(AddTodo.agent.name, "post_todos");
  assertEquals(AddTodo.agent.description, "Add a new todo item.");
  assertEquals(AddTodo.agent.method, "POST");
  assertEquals(AddTodo.agent.schema, objectSchema);
});

Deno.test("agent descriptor is absent for a plain component (backward compat)", () => {
  const Plain = hsxComponent("/todos", {
    methods: ["POST"],
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  assertEquals(Plain.agent, undefined);
});

Deno.test("agent descriptor requires both describe and input, not just one", () => {
  const onlyDescribe = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo",
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });
  const onlyInput = hsxComponent("/todos", {
    methods: ["POST"],
    input: { schema: objectSchema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  assertEquals(onlyDescribe.agent, undefined);
  assertEquals(onlyInput.agent, undefined);
});

Deno.test("agent name slugs path params and defaults the method to GET", () => {
  const GetUser = hsxComponent("/users/:id", {
    describe: "Fetch a user by id.",
    input: { schema: { type: "object" } },
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(GetUser.agent?.name, "get_users_id");
  assertEquals(GetUser.agent?.method, "GET");
});

Deno.test("agent method picks the first non-GET method when several are allowed", () => {
  const TodoList = hsxComponent("/todos", {
    methods: ["GET", "POST"],
    describe: "Manage todos.",
    input: { schema: objectSchema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  assertEquals(TodoList.agent?.method, "POST");
});

Deno.test("agentName overrides the derived tool name", () => {
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    agentName: "add_todo",
    describe: "Add a todo.",
    input: { schema: objectSchema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  assertEquals(AddTodo.agent?.name, "add_todo");
});

Deno.test("agent descriptor carries the input assert guard", () => {
  let received: unknown = undefined;
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo.",
    input: {
      schema: objectSchema,
      assert: (raw) => {
        received = raw;
      },
    },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  AddTodo.agent?.assert?.({ text: "milk" });
  assertEquals(received, { text: "milk" });
});
