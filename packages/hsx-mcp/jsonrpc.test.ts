/**
 * Tests for the JSON-RPC 2.0 envelope layer.
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  JSONRPC_INVALID_REQUEST,
  parseMessage,
  rpcError,
  rpcOk,
} from "./jsonrpc.ts";

Deno.test("parseMessage classifies a request", () => {
  const parsed = parseMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: { cursor: "abc" },
  });
  assertEquals(parsed, {
    tag: "request",
    id: 1,
    method: "tools/list",
    params: { cursor: "abc" },
  });
});

Deno.test("parseMessage defaults missing params to an empty object", () => {
  const parsed = parseMessage({ jsonrpc: "2.0", id: "a", method: "ping" });
  assertEquals(parsed.tag, "request");
  if (parsed.tag === "request") assertEquals(parsed.params, {});
});

Deno.test("parseMessage classifies a notification (no id)", () => {
  const parsed = parseMessage({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });
  assertEquals(parsed, {
    tag: "notification",
    method: "notifications/initialized",
  });
});

Deno.test("parseMessage classifies a batch array", () => {
  assertEquals(parseMessage([{ jsonrpc: "2.0", id: 1, method: "ping" }]), {
    tag: "batch",
  });
});

Deno.test("parseMessage rejects malformed bodies as invalid", () => {
  for (
    const body of [
      null,
      42,
      "hello",
      {},
      { jsonrpc: "1.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", id: 1 },
      { jsonrpc: "2.0", id: { nested: true }, method: "ping" },
    ]
  ) {
    const parsed = parseMessage(body);
    assertEquals(parsed.tag, "invalid");
    if (parsed.tag === "invalid") {
      assertEquals(parsed.code, JSONRPC_INVALID_REQUEST);
    }
  }
});

Deno.test("rpcOk and rpcError echo the id and set the envelope", () => {
  assertEquals(rpcOk(7, { tools: [] }), {
    jsonrpc: "2.0",
    id: 7,
    result: { tools: [] },
  });
  assertEquals(rpcError(null, -32700, "Parse error"), {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32700, message: "Parse error" },
  });
  assertEquals(
    rpcError("x", -32002, "Resource not found", { uri: "hsx://nope" }),
    {
      jsonrpc: "2.0",
      id: "x",
      error: {
        code: -32002,
        message: "Resource not found",
        data: { uri: "hsx://nope" },
      },
    },
  );
});
