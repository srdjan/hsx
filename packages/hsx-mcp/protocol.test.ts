/**
 * Tests for the MCP protocol dispatch: real hsxComponents, no network.
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent, HsxHttpError } from "@srdjan/hsx";
import { jsx } from "hsx/jsx-runtime";
import { createProtocolContext, dispatch } from "./protocol.ts";

const addTodoSchema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

/** A todos component backed by a closure store. */
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

/** A component with a path parameter, to exercise toRequest's param split. */
function makeToggle(store: { text: string; done: boolean }[]) {
  return hsxComponent("/todos/:id/toggle", {
    methods: ["POST"],
    describe: "Toggle a todo by index.",
    input: {
      schema: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
    handler(_req, params) {
      const index = Number(params.id);
      store[index].done = !store[index].done;
      return { todos: [...store] };
    },
    render: ({ todos }: { todos: { text: string; done: boolean }[] }) =>
      jsx("ul", {
        id: "todo-list",
        children: todos.map((t) =>
          jsx("li", { "data-done": String(t.done), children: t.text })
        ),
      }),
  });
}

function makeContext(
  components: Parameters<typeof createProtocolContext>[0]["components"],
  overrides: Partial<Parameters<typeof createProtocolContext>[0]> = {},
) {
  return createProtocolContext({ components, ...overrides });
}

function resultOf(envelope: Record<string, unknown>): Record<string, unknown> {
  return envelope.result as Record<string, unknown>;
}

function errorOf(envelope: Record<string, unknown>): Record<string, unknown> {
  return envelope.error as Record<string, unknown>;
}

function contentText(envelope: Record<string, unknown>): string {
  const content = resultOf(envelope).content as Array<{ text: string }>;
  return content[0].text;
}

Deno.test("initialize echoes a supported protocol version", async () => {
  const ctx = makeContext([makeAddTodo([])]);
  const res = await dispatch(ctx, 0, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  assertEquals(resultOf(res).protocolVersion, "2025-03-26");
});

Deno.test("initialize answers an unknown version with the newest supported", async () => {
  const ctx = makeContext([makeAddTodo([])]);
  const res = await dispatch(ctx, 0, "initialize", {
    protocolVersion: "1999-01-01",
  });
  assertEquals(resultOf(res).protocolVersion, "2025-06-18");
});

Deno.test("initialize declares resources capability only with a manifest", async () => {
  const without = await dispatch(
    makeContext([makeAddTodo([])]),
    0,
    "initialize",
    {},
  );
  assertEquals(resultOf(without).capabilities, { tools: {} });

  const withManifest = await dispatch(
    makeContext([makeAddTodo([])], {
      manifest: { appName: "Todos" },
      serverName: "todos",
      serverVersion: "1.0.0",
      instructions: "Operate the todos app.",
    }),
    0,
    "initialize",
    {},
  );
  assertEquals(resultOf(withManifest).capabilities, {
    tools: {},
    resources: {},
  });
  assertEquals(resultOf(withManifest).serverInfo, {
    name: "todos",
    version: "1.0.0",
  });
  assertEquals(resultOf(withManifest).instructions, "Operate the todos app.");
});

Deno.test("ping returns an empty result", async () => {
  const res = await dispatch(makeContext([]), 1, "ping", {});
  assertEquals(resultOf(res), {});
});

Deno.test("tools/list maps parameters to inputSchema", async () => {
  const ctx = makeContext([makeAddTodo([])]);
  const res = await dispatch(ctx, 2, "tools/list", {});
  assertEquals(resultOf(res).tools, [{
    name: "post_todos",
    description: "Add a todo item.",
    inputSchema: addTodoSchema,
  }]);
});

Deno.test("tools/call runs the real component and returns its HTML", async () => {
  const store: string[] = [];
  const ctx = makeContext([makeAddTodo(store)]);
  const res = await dispatch(ctx, 3, "tools/call", {
    name: "post_todos",
    arguments: { text: "milk" },
  });

  assertEquals(store, ["milk"]);
  const text = contentText(res);
  assertStringIncludes(text, "HTTP 200");
  assertStringIncludes(text, "<li>milk</li>");
  assertEquals(resultOf(res).isError, undefined);
});

Deno.test("tools/call routes path-parameter arguments through the URL", async () => {
  const store = [{ text: "milk", done: false }];
  const ctx = makeContext([makeToggle(store)]);
  const res = await dispatch(ctx, 4, "tools/call", {
    name: "post_todos_id_toggle",
    arguments: { id: 0 },
  });

  assertEquals(store[0].done, true);
  assertStringIncludes(contentText(res), `data-done="true"`);
});

Deno.test("tools/call caps long observations", async () => {
  const store: string[] = ["x".repeat(500)];
  const ctx = makeContext([makeAddTodo(store)], { observationCap: 64 });
  const res = await dispatch(ctx, 5, "tools/call", {
    name: "post_todos",
    arguments: { text: "y" },
  });
  assertStringIncludes(contentText(res), "...[truncated]");
});

Deno.test("tools/call with an unknown tool is a JSON-RPC error", async () => {
  const res = await dispatch(makeContext([]), 6, "tools/call", {
    name: "no_such_tool",
    arguments: {},
  });
  assertEquals(errorOf(res).code, -32602);
});

Deno.test("tools/call surfaces a handler throw as isError, not a protocol error", async () => {
  // hsxComponent.handle() converts handler throws to HTTP 500 responses.
  const Failing = hsxComponent("/fail", {
    methods: ["POST"],
    describe: "Always fails.",
    input: { schema: { type: "object", properties: {} } },
    handler(): { ok: boolean } {
      throw new Error("boom");
    },
    render: () => jsx("p", { children: "never" }),
  });
  const res = await dispatch(makeContext([Failing]), 7, "tools/call", {
    name: "post_fail",
    arguments: {},
  });
  assertEquals(res.error, undefined);
  assertEquals(resultOf(res).isError, true);
  assertStringIncludes(contentText(res), "HTTP 500");
});

Deno.test("tools/call surfaces an input.assert rejection as isError text", async () => {
  const Strict = hsxComponent("/strict", {
    methods: ["POST"],
    describe: "Validates its input.",
    input: {
      schema: { type: "object", properties: {} },
      assert: () => {
        throw new Error("text is required");
      },
    },
    handler(): { ok: boolean } {
      return { ok: true };
    },
    render: () => jsx("p", { children: "never" }),
  });
  const res = await dispatch(makeContext([Strict]), 7, "tools/call", {
    name: "post_strict",
    arguments: {},
  });
  assertEquals(res.error, undefined);
  assertEquals(resultOf(res).isError, true);
  assertStringIncludes(contentText(res), "Error: text is required");
});

Deno.test("tools/call maps an HsxHttpError response to isError with the status", async () => {
  const Invalid = hsxComponent("/invalid", {
    methods: ["POST"],
    describe: "Rejects input.",
    input: { schema: { type: "object", properties: {} } },
    handler(): { ok: boolean } {
      throw new HsxHttpError(422, "unprocessable");
    },
    render: () => jsx("p", { children: "never" }),
  });
  const res = await dispatch(makeContext([Invalid]), 8, "tools/call", {
    name: "post_invalid",
    arguments: {},
  });
  assertEquals(resultOf(res).isError, true);
  assertStringIncludes(contentText(res), "HTTP 422");
});

Deno.test("tools/call validates params shape", async () => {
  const noName = await dispatch(makeContext([]), 9, "tools/call", {});
  assertEquals(errorOf(noName).code, -32602);

  const badArgs = await dispatch(makeContext([]), 10, "tools/call", {
    name: "post_todos",
    arguments: "not-an-object",
  });
  assertEquals(errorOf(badArgs).code, -32602);
});

Deno.test("resources/list and resources/read serve the manifest", async () => {
  const manifest = { appName: "Todos", components: ["post_todos"] };
  const ctx = makeContext([], { manifest });

  const list = await dispatch(ctx, 11, "resources/list", {});
  const resources = resultOf(list).resources as Array<{ uri: string }>;
  assertEquals(resources.length, 1);
  assertEquals(resources[0].uri, "hsx://manifest");

  const read = await dispatch(ctx, 12, "resources/read", {
    uri: "hsx://manifest",
  });
  const contents = resultOf(read).contents as Array<{ text: string }>;
  assertEquals(JSON.parse(contents[0].text), manifest);
});

Deno.test("resources/list is empty and reads fail without a manifest", async () => {
  const ctx = makeContext([]);
  const list = await dispatch(ctx, 13, "resources/list", {});
  assertEquals(resultOf(list).resources, []);

  const read = await dispatch(ctx, 14, "resources/read", {
    uri: "hsx://manifest",
  });
  assertEquals(errorOf(read).code, -32002);
});

Deno.test("unknown methods get -32601", async () => {
  const res = await dispatch(makeContext([]), 15, "prompts/list", {});
  assertEquals(errorOf(res).code, -32601);
});
