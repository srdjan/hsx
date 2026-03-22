/**
 * Unit tests for SSE rendering support.
 *
 * Run with: deno test --allow-read --allow-net packages/hsx/sse.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { jsx } from "hsx/jsx-runtime";
import { renderSSE } from "./sse.ts";

// =============================================================================
// Helpers
// =============================================================================

async function collectSSEResponse(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

async function* yieldRenderables(
  items: Array<ReturnType<typeof jsx> | string>,
): AsyncIterable<ReturnType<typeof jsx> | string> {
  for (const item of items) {
    yield item;
  }
}

// =============================================================================
// Tests
// =============================================================================

Deno.test("renderSSE returns correct content-type header", () => {
  const response = renderSSE(yieldRenderables([]));
  assertEquals(response.headers.get("content-type"), "text/event-stream");
  assertEquals(response.headers.get("cache-control"), "no-cache");
});

Deno.test("renderSSE emits SSE frames for each renderable", async () => {
  const chunks = [
    jsx("div", { children: "Hello" }),
    jsx("p", { children: "World" }),
  ];

  const response = renderSSE(yieldRenderables(chunks));
  const output = await collectSSEResponse(response);

  assertStringIncludes(output, "event: message");
  assertStringIncludes(output, "data: <div>Hello</div>");
  assertStringIncludes(output, "data: <p>World</p>");
});

Deno.test("renderSSE uses custom event name", async () => {
  const chunks = [jsx("span", { children: "test" })];

  const response = renderSSE(yieldRenderables(chunks), {
    event: "widget",
  });
  const output = await collectSSEResponse(response);

  assertStringIncludes(output, "event: widget");
  assertStringIncludes(output, "data: <span>test</span>");
});

Deno.test("renderSSE skips empty renderables", async () => {
  async function* gen() {
    yield jsx("div", { children: "visible" });
    yield null as unknown as ReturnType<typeof jsx>;
    yield jsx("span", { children: "also visible" });
  }

  const response = renderSSE(gen());
  const output = await collectSSEResponse(response);

  // Null renders as empty string, which is skipped
  const eventCount = (output.match(/event: message/g) || []).length;
  assertEquals(eventCount, 2);
});

Deno.test("renderSSE emits error event on exception", async () => {
  async function* failing() {
    yield jsx("div", { children: "ok" });
    throw new Error("test error");
  }

  const response = renderSSE(failing());
  const output = await collectSSEResponse(response);

  assertStringIncludes(output, "event: error");
  assertStringIncludes(output, "test error");
});
