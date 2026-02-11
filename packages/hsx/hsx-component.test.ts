/**
 * Unit tests for HSX Component functionality.
 * Focus on URL building, parameter validation, and error handling.
 *
 * Run with: deno test --allow-read packages/hsx/hsx-component.test.ts
 */

import { assertEquals, assertThrows, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "./hsx-component.ts";
import { jsx } from "./jsx-runtime.ts";

// =============================================================================
// URL Parameter Validation Tests
// =============================================================================

Deno.test("build() throws error for missing required parameters", () => {
  const component = hsxComponent("/users/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertThrows(
    () => component.build({} as { id: string }),
    Error,
    "Missing required route parameters: id"
  );
});

Deno.test("build() throws error listing all missing parameters", () => {
  const component = hsxComponent("/users/:userId/posts/:postId", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertThrows(
    () => component.build({} as { userId: string; postId: string }),
    Error,
    "userId, postId"
  );
});

Deno.test("build() URL-encodes parameter values", () => {
  const component = hsxComponent("/search/:query", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const url = component.build({ query: "hello world" });
  assertEquals(url, "/search/hello%20world");
});

Deno.test("build() URL-encodes special characters", () => {
  const component = hsxComponent("/files/:name", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const url = component.build({ name: "file/with/slashes" });
  assertEquals(url, "/files/file%2Fwith%2Fslashes");
});

Deno.test("build() prevents path traversal attacks", () => {
  const component = hsxComponent("/files/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const url = component.build({ id: "../../../etc/passwd" });
  // The ../ should be URL-encoded, preventing path traversal
  assertEquals(url, "/files/..%2F..%2F..%2Fetc%2Fpasswd");
});

Deno.test("build() works with valid parameters", () => {
  const component = hsxComponent("/users/:id/posts/:postId", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const url = component.build({ id: "123", postId: "456" });
  assertEquals(url, "/users/123/posts/456");
});

Deno.test("build() converts numeric parameters to strings", () => {
  const component = hsxComponent("/items/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const url = component.build({ id: 42 });
  assertEquals(url, "/items/42");
});

// =============================================================================
// Path Matching Tests
// =============================================================================

Deno.test("match() returns null for non-matching paths", () => {
  const component = hsxComponent("/users/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.match("/posts/123"), null);
});

Deno.test("match() extracts single parameter", () => {
  const component = hsxComponent("/users/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.match("/users/123"), { id: "123" });
});

Deno.test("match() extracts multiple parameters", () => {
  const component = hsxComponent("/users/:userId/posts/:postId", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.match("/users/42/posts/99"), { userId: "42", postId: "99" });
});

Deno.test("match() handles static paths", () => {
  const component = hsxComponent("/about", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.match("/about"), {});
  assertEquals(component.match("/other"), null);
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test("handle() returns 500 for handler errors", async () => {
  const component = hsxComponent("/error", {
    handler: () => {
      throw new Error("Handler error");
    },
    render: () => jsx("div", {}),
  });

  const req = new Request("http://localhost/error");
  const res = await component.handle(req);

  assertEquals(res.status, 500);
  assertEquals(await res.text(), "Internal Server Error");
});

Deno.test("handle() returns 500 for render errors", async () => {
  const component = hsxComponent("/render-error", {
    handler: () => ({ value: "test" }),
    render: () => {
      throw new Error("Render error");
    },
  });

  const req = new Request("http://localhost/render-error");
  const res = await component.handle(req);

  assertEquals(res.status, 500);
});

Deno.test("handle() returns 500 for async handler errors", async () => {
  const component = hsxComponent("/async-error", {
    handler: async () => {
      await Promise.resolve();
      throw new Error("Async handler error");
    },
    render: () => jsx("div", {}),
  });

  const req = new Request("http://localhost/async-error");
  const res = await component.handle(req);

  assertEquals(res.status, 500);
});

Deno.test("handle() returns 404 for non-matching paths", async () => {
  const component = hsxComponent("/users/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  const req = new Request("http://localhost/posts/123");
  const res = await component.handle(req);

  assertEquals(res.status, 404);
});

// =============================================================================
// Successful Handling Tests
// =============================================================================

Deno.test("handle() returns rendered HTML for matching paths", async () => {
  const component = hsxComponent("/greeting/:name", {
    handler: (_req, params) => ({ name: params.name }),
    render: ({ name }) => jsx("div", { children: `Hello, ${name}!` }),
  });

  const req = new Request("http://localhost/greeting/World");
  const res = await component.handle(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  assertEquals(await res.text(), "<div>Hello, World!</div>");
});

Deno.test("handle() works with async handlers", async () => {
  const component = hsxComponent("/async/:id", {
    handler: async (_req, params) => {
      await Promise.resolve();
      return { id: params.id };
    },
    render: ({ id }) => jsx("span", { children: `ID: ${id}` }),
  });

  const req = new Request("http://localhost/async/42");
  const res = await component.handle(req);

  assertEquals(res.status, 200);
  assertEquals(await res.text(), "<span>ID: 42</span>");
});

// =============================================================================
// HTTP Method Tests
// =============================================================================

Deno.test("component has correct default methods", () => {
  const component = hsxComponent("/test", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.methods, ["GET"]);
});

Deno.test("component has correct custom methods", () => {
  const component = hsxComponent("/test", {
    methods: ["GET", "POST", "DELETE"],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.methods, ["GET", "POST", "DELETE"]);
});

Deno.test("methods array is frozen (immutable)", () => {
  const component = hsxComponent("/test", {
    methods: ["GET"],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertThrows(() => {
    (component.methods as string[]).push("POST");
  });
});

// =============================================================================
// Component Property Tests
// =============================================================================

Deno.test("component exposes path property", () => {
  const component = hsxComponent("/users/:id", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });

  assertEquals(component.path, "/users/:id");
});

Deno.test("component exposes Component render function", () => {
  const renderFn = ({ msg }: { msg: string }) => jsx("div", { children: msg });
  const component = hsxComponent("/test", {
    handler: () => ({ msg: "test" }),
    render: renderFn,
  });

  assertEquals(component.Component, renderFn);
});

// =============================================================================
// HTTP Method Enforcement Tests (Phase 1C)
// =============================================================================

Deno.test("handle() returns 405 for disallowed methods", async () => {
  const component = hsxComponent("/items", {
    methods: ["GET"],
    handler: () => ({ items: [] }),
    render: () => jsx("div", {}),
  });

  const req = new Request("http://localhost/items", { method: "POST" });
  const res = await component.handle(req);

  assertEquals(res.status, 405);
  assertEquals(await res.text(), "Method Not Allowed");
});

Deno.test("handle() includes Allow header with permitted methods", async () => {
  const component = hsxComponent("/items", {
    methods: ["GET", "POST"],
    handler: () => ({ items: [] }),
    render: () => jsx("div", {}),
  });

  const req = new Request("http://localhost/items", { method: "DELETE" });
  const res = await component.handle(req);

  assertEquals(res.status, 405);
  assertEquals(res.headers.get("allow"), "GET, POST");
});

Deno.test("handle() allows matching method", async () => {
  const component = hsxComponent("/items", {
    methods: ["GET", "POST"],
    handler: () => ({ items: [] }),
    render: () => jsx("div", { children: "ok" }),
  });

  const req = new Request("http://localhost/items", { method: "POST" });
  const res = await component.handle(req);

  assertEquals(res.status, 200);
});

// =============================================================================
// Duplicate Path Parameter Tests (Phase 1E)
// =============================================================================

Deno.test("throws for duplicate path parameters", () => {
  assertThrows(
    () => hsxComponent("/users/:id/related/:id", {
      handler: () => ({}),
      render: () => jsx("div", {}),
    }),
    Error,
    'Duplicate path parameter ":id"'
  );
});

Deno.test("allows different parameter names", () => {
  const component = hsxComponent("/users/:userId/posts/:postId", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertEquals(component.path, "/users/:userId/posts/:postId");
});

// =============================================================================
// Integration Test: Full Request/Response Cycle (Phase 2F)
// =============================================================================

Deno.test("handle() processes POST with FormData end-to-end", async () => {
  const component = hsxComponent("/todos", {
    methods: ["POST"],
    handler: async (req) => {
      const form = await req.formData();
      const text = String(form.get("text") ?? "");
      return { text };
    },
    render: ({ text }) => jsx("li", { children: text }),
  });

  const formData = new FormData();
  formData.set("text", "Buy groceries");

  const req = new Request("http://localhost/todos", {
    method: "POST",
    body: formData,
  });
  const res = await component.handle(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  assertEquals(await res.text(), "<li>Buy groceries</li>");
});
