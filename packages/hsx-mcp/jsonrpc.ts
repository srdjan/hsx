/**
 * Minimal JSON-RPC 2.0 envelope handling for the MCP endpoint.
 *
 * Hand-rolled on purpose: the MCP subset hsx-mcp speaks needs only message
 * classification and result/error builders, so a protocol SDK would be the
 * package's lone dependency for under a hundred lines of code - the same
 * trade the Claude provider makes with raw fetch over an SDK.
 *
 * @module jsonrpc
 */

// JSON-RPC 2.0 error codes used by this server.
export const JSONRPC_PARSE_ERROR = -32700;
export const JSONRPC_INVALID_REQUEST = -32600;
export const JSONRPC_METHOD_NOT_FOUND = -32601;
export const JSONRPC_INVALID_PARAMS = -32602;
/** MCP-defined: resource not found. */
export const MCP_RESOURCE_NOT_FOUND = -32002;

/** A JSON-RPC request id. Notifications carry no id at all. */
export type JsonRpcId = string | number | null;

/** One decoded POST body, classified for dispatch. */
export type ParsedMessage =
  | {
    readonly tag: "request";
    readonly id: JsonRpcId;
    readonly method: string;
    readonly params: Record<string, unknown>;
  }
  | { readonly tag: "notification"; readonly method: string }
  | { readonly tag: "batch" }
  | {
    readonly tag: "invalid";
    readonly code: number;
    readonly message: string;
  };

/** Narrow an unknown to a plain object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const INVALID: ParsedMessage = {
  tag: "invalid",
  code: JSONRPC_INVALID_REQUEST,
  message: "Invalid Request",
};

/**
 * Classify a decoded JSON body. Batch arrays are legal in older protocol
 * revisions but unused by MCP clients; they are surfaced as their own tag
 * so the transport can reject them explicitly.
 */
export function parseMessage(body: unknown): ParsedMessage {
  if (Array.isArray(body)) return { tag: "batch" };
  if (
    !isRecord(body) || body.jsonrpc !== "2.0" ||
    typeof body.method !== "string"
  ) {
    return INVALID;
  }
  const params = isRecord(body.params) ? body.params : {};
  if (!("id" in body)) {
    return { tag: "notification", method: body.method };
  }
  const id = body.id;
  if (typeof id !== "string" && typeof id !== "number" && id !== null) {
    return INVALID;
  }
  return { tag: "request", id, method: body.method, params };
}

/** Build a JSON-RPC result envelope. */
export function rpcOk(
  id: JsonRpcId,
  result: Record<string, unknown>,
): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}

/** Build a JSON-RPC error envelope. */
export function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    error: data ? { code, message, data } : { code, message },
  };
}
