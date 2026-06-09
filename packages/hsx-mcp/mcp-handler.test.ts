/**
 * Tests for the MCP HTTP layer: full Request -> Response, no network.
 */

import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "@srdjan/hsx";
import { jsx } from "hsx/jsx-runtime";
import { createMcpHandler } from "./mcp-handler.ts";

function makeAddTodo(store: string[]) {
  return hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo item.",
    input: {
      schema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
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

function post(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost:8000/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function rpc(id: number, method: string, params?: Record<string, unknown>) {
  return { jsonrpc: "2.0", id, method, ...(params ? { params } : {}) };
}

Deno.test("handle returns null for non-mcp paths", () => {
  const mcp = createMcpHandler({ components: [] });
  assertEquals(
    mcp.handle(new Request("http://localhost:8000/other")),
    null,
  );
});

Deno.test("POST initialize answers 200 with a JSON envelope", async () => {
  const mcp = createMcpHandler({ components: [makeAddTodo([])] });
  const res = await mcp.handle(post(rpc(0, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  })))!;

  assertEquals(res.status, 200);
  assertStringIncludes(
    res.headers.get("content-type") ?? "",
    "application/json",
  );
  const envelope = await res.json();
  assertEquals(envelope.jsonrpc, "2.0");
  assertEquals(envelope.id, 0);
  assertEquals(envelope.result.protocolVersion, "2025-06-18");
});

Deno.test("notifications get 202 with an empty body", async () => {
  const mcp = createMcpHandler({ components: [] });
  const res = await mcp.handle(
    post({ jsonrpc: "2.0", method: "notifications/initialized" }),
  )!;
  assertEquals(res.status, 202);
  assertEquals(await res.text(), "");
});

Deno.test("GET and DELETE get 405 with Allow: POST", async () => {
  const mcp = createMcpHandler({ components: [] });
  for (const method of ["GET", "DELETE"]) {
    const res = await mcp.handle(
      new Request("http://localhost:8000/mcp", { method }),
    )!;
    assertEquals(res.status, 405);
    assertEquals(res.headers.get("allow"), "POST");
  }
});

Deno.test("malformed JSON gets 400 with a parse error envelope", async () => {
  const mcp = createMcpHandler({ components: [] });
  const res = await mcp.handle(post("{nope"))!;
  assertEquals(res.status, 400);
  const envelope = await res.json();
  assertEquals(envelope.error.code, -32700);
  assertEquals(envelope.id, null);
});

Deno.test("batch arrays are rejected with -32600", async () => {
  const mcp = createMcpHandler({ components: [] });
  const res = await mcp.handle(post([rpc(1, "ping")]))!;
  assertEquals(res.status, 400);
  const envelope = await res.json();
  assertEquals(envelope.error.code, -32600);
});

Deno.test("authorize: false blocks before any component runs", async () => {
  const store: string[] = [];
  const mcp = createMcpHandler({
    components: [makeAddTodo(store)],
    authorize: () => false,
  });
  const res = await mcp.handle(post(rpc(1, "tools/call", {
    name: "post_todos",
    arguments: { text: "milk" },
  })))!;

  assertEquals(res.status, 401);
  assertEquals(res.headers.get("www-authenticate"), "Bearer");
  assertEquals(store, []);
});

Deno.test("bearerToken accepts the matching header and rejects others", async () => {
  const mcp = createMcpHandler({ components: [], bearerToken: "s3cret" });

  const ok = await mcp.handle(
    post(rpc(1, "ping"), { authorization: "Bearer s3cret" }),
  )!;
  assertEquals(ok.status, 200);

  const rejected: Record<string, string>[] = [
    {},
    { authorization: "Bearer wrong" },
    { authorization: "Basic s3cret" },
  ];
  for (const headers of rejected) {
    const res = await mcp.handle(post(rpc(1, "ping"), headers))!;
    assertEquals(res.status, 401);
  }
});

Deno.test("authorize and bearerToken together throw at creation", () => {
  assertThrows(
    () =>
      createMcpHandler({
        components: [],
        authorize: () => true,
        bearerToken: "x",
      }),
    Error,
    "not both",
  );
});

Deno.test("cross-origin browser requests are rejected, allow-listed pass", async () => {
  const mcp = createMcpHandler({
    components: [],
    allowedOrigins: ["http://trusted.example"],
  });

  const evil = await mcp.handle(
    post(rpc(1, "ping"), { origin: "http://evil.example" }),
  )!;
  assertEquals(evil.status, 403);

  const sameHost = await mcp.handle(
    post(rpc(1, "ping"), { origin: "http://localhost:8000" }),
  )!;
  assertEquals(sameHost.status, 200);

  const trusted = await mcp.handle(
    post(rpc(1, "ping"), { origin: "http://trusted.example" }),
  )!;
  assertEquals(trusted.status, 200);
});

Deno.test("initialize -> tools/list -> tools/call works statelessly", async () => {
  const store: string[] = [];
  const mcp = createMcpHandler({ components: [makeAddTodo(store)] });

  const init = await mcp.handle(post(rpc(0, "initialize", {
    protocolVersion: "2025-06-18",
  })))!;
  assertEquals(init.status, 200);
  assertEquals(init.headers.get("mcp-session-id"), null);

  const list = await mcp.handle(post(rpc(1, "tools/list")))!;
  const tools = (await list.json()).result.tools;
  assertEquals(tools.map((t: { name: string }) => t.name), ["post_todos"]);

  const call = await mcp.handle(post(rpc(2, "tools/call", {
    name: "post_todos",
    arguments: { text: "milk" },
  })))!;
  const result = (await call.json()).result;
  assertEquals(store, ["milk"]);
  assertStringIncludes(result.content[0].text, "<li>milk</li>");
});

Deno.test("a custom basePath mounts where asked", async () => {
  const mcp = createMcpHandler({ components: [], basePath: "/agent/mcp/" });
  assertEquals(
    mcp.handle(new Request("http://localhost:8000/mcp", { method: "POST" })),
    null,
  );
  const res = await mcp.handle(
    new Request("http://localhost:8000/agent/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rpc(1, "ping")),
    }),
  )!;
  assertEquals(res.status, 200);
});
