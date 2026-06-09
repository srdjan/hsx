/**
 * Tests for componentsToTools: deriving AI tool definitions from the
 * `.agent` descriptors of agent-callable HSX components.
 */

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "@srdjan/hsx";
import { componentsToTools } from "./component-tools.ts";

const addTodoSchema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

Deno.test("componentsToTools builds a tool definition from an agent component", () => {
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a new todo item.",
    input: { schema: addTodoSchema },
    handler: () => ({}),
    render: () => "ok",
  });

  const tools = componentsToTools([AddTodo]);

  assertEquals(tools, [
    {
      name: "post_todos",
      description: "Add a new todo item.",
      parameters: addTodoSchema,
    },
  ]);
});

Deno.test("componentsToTools skips components without an agent descriptor", () => {
  const Health = hsxComponent("/health", {
    handler: () => ({}),
    render: () => "ok",
  });
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo.",
    input: { schema: addTodoSchema },
    handler: () => ({}),
    render: () => "ok",
  });

  const tools = componentsToTools([Health, AddTodo]);

  assertEquals(tools.length, 1);
  assertEquals(tools[0].name, "post_todos");
});

Deno.test("componentsToTools throws on duplicate tool names", () => {
  const a = hsxComponent("/todos", {
    methods: ["POST"],
    agentName: "dup",
    describe: "a",
    input: { schema: {} },
    handler: () => ({}),
    render: () => "ok",
  });
  const b = hsxComponent("/other", {
    methods: ["POST"],
    agentName: "dup",
    describe: "b",
    input: { schema: {} },
    handler: () => ({}),
    render: () => "ok",
  });

  assertThrows(
    () => componentsToTools([a, b]),
    Error,
    "Duplicate agent tool name: dup",
  );
});
