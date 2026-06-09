/**
 * MCP protocol dispatch - the methods hsx-mcp answers, free of HTTP concerns.
 *
 * Implements the request/response subset an MCP client needs to discover and
 * call tools: initialize, ping, tools/list, tools/call, and (when a manifest
 * is configured) resources/list + resources/read. Everything else is gated
 * behind capabilities this server does not declare, so a conforming client
 * never asks for it; unknown methods get -32601.
 *
 * Tool calls drive the app's real components: toRequest() synthesizes the
 * same Request a human's HTMX interaction would produce, the component's own
 * handle() serves it, and the rendered HTML comes back as the tool result -
 * the agent observes the same hypermedia a human sees.
 *
 * @module protocol
 */

import {
  type AgentComponent,
  componentsToTools,
  toRequest,
} from "@srdjan/hsx-agent";
import type { ToolDefinition } from "@srdjan/hsx-widgets";
import {
  isRecord,
  JSONRPC_INVALID_PARAMS,
  JSONRPC_METHOD_NOT_FOUND,
  type JsonRpcId,
  MCP_RESOURCE_NOT_FOUND,
  rpcError,
  rpcOk,
} from "./jsonrpc.ts";

// =============================================================================
// Context
// =============================================================================

/** Inputs the dispatcher needs; resolved once at handler creation. */
export type ProtocolOptions = {
  readonly components: ReadonlyArray<AgentComponent>;
  readonly origin?: string;
  readonly observationCap?: number;
  readonly serverName?: string;
  readonly serverVersion?: string;
  readonly instructions?: string;
  readonly manifest?: Readonly<Record<string, unknown>>;
};

/** Resolved dispatch context. */
export type ProtocolContext = {
  readonly tools: ReadonlyArray<ToolDefinition>;
  readonly byName: ReadonlyMap<string, AgentComponent>;
  readonly origin: string;
  readonly observationCap: number;
  readonly serverName: string;
  readonly serverVersion: string;
  readonly instructions?: string;
  readonly manifest?: Readonly<Record<string, unknown>>;
};

/** Resolve options into a dispatch context (derives tools, applies defaults). */
export function createProtocolContext(
  options: ProtocolOptions,
): ProtocolContext {
  const tools = componentsToTools(options.components);
  const byName = new Map<string, AgentComponent>();
  for (const component of options.components) {
    if (component.agent) byName.set(component.agent.name, component);
  }
  return {
    tools,
    byName,
    origin: options.origin ?? "http://localhost",
    observationCap: options.observationCap ?? 4096,
    serverName: options.serverName ?? "hsx-mcp",
    serverVersion: options.serverVersion ?? "0.1.0",
    instructions: options.instructions,
    manifest: options.manifest,
  };
}

// =============================================================================
// Dispatch
// =============================================================================

/** Newest first. Echo the client's version when supported, else reply newest. */
const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [
  "2025-06-18",
  "2025-03-26",
];

const MANIFEST_URI = "hsx://manifest";

/** Answer one JSON-RPC request with a JSON-RPC response envelope. */
export async function dispatch(
  ctx: ProtocolContext,
  id: JsonRpcId,
  method: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (method) {
    case "initialize":
      return rpcOk(id, initializeResult(ctx, params));
    case "ping":
      return rpcOk(id, {});
    case "tools/list":
      return rpcOk(id, {
        tools: ctx.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      });
    case "tools/call":
      return await callTool(ctx, id, params);
    case "resources/list":
      return rpcOk(id, { resources: listResources(ctx) });
    case "resources/read":
      return readResource(ctx, id, params);
    default:
      return rpcError(
        id,
        JSONRPC_METHOD_NOT_FOUND,
        `Method not found: ${method}`,
      );
  }
}

function initializeResult(
  ctx: ProtocolContext,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const requested = typeof params.protocolVersion === "string"
    ? params.protocolVersion
    : "";
  const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[0];

  const capabilities: Record<string, unknown> = { tools: {} };
  if (ctx.manifest) capabilities.resources = {};

  const result: Record<string, unknown> = {
    protocolVersion,
    capabilities,
    serverInfo: { name: ctx.serverName, version: ctx.serverVersion },
  };
  if (ctx.instructions) result.instructions = ctx.instructions;
  return result;
}

/** The text the model sees: status line plus the (capped) rendered HTML. Mirrors app-agent. */
function projectObservation(status: number, html: string, cap: number): string {
  const trimmed = html.length > cap
    ? `${html.slice(0, cap)}\n...[truncated]`
    : html;
  return `HTTP ${status}\n${trimmed}`;
}

async function callTool(
  ctx: ProtocolContext,
  id: JsonRpcId,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const name = params.name;
  if (typeof name !== "string") {
    return rpcError(
      id,
      JSONRPC_INVALID_PARAMS,
      "tools/call requires a string `name`",
    );
  }
  const args = params.arguments;
  if (args !== undefined && !isRecord(args)) {
    return rpcError(
      id,
      JSONRPC_INVALID_PARAMS,
      "tools/call `arguments` must be an object",
    );
  }
  const component = ctx.byName.get(name);
  if (!component) {
    return rpcError(id, JSONRPC_INVALID_PARAMS, `Unknown tool: ${name}`);
  }

  try {
    const request = toRequest(component, args ?? {}, ctx.origin);
    const response = await component.handle(request);
    const html = await response.text();
    const result: Record<string, unknown> = {
      content: [{
        type: "text",
        text: projectObservation(response.status, html, ctx.observationCap),
      }],
    };
    // Execution failures the model should observe and recover from carry
    // isError rather than a JSON-RPC error (the call itself was well-formed).
    if (response.status >= 400) result.isError = true;
    return rpcOk(id, result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return rpcOk(id, {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    });
  }
}

function listResources(ctx: ProtocolContext): Array<Record<string, unknown>> {
  if (!ctx.manifest) return [];
  return [{
    uri: MANIFEST_URI,
    name: "HSX hypermedia manifest",
    description:
      "Pages, components, agent tools, interactions, and targets of this app.",
    mimeType: "application/json",
  }];
}

function readResource(
  ctx: ProtocolContext,
  id: JsonRpcId,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const uri = params.uri;
  if (typeof uri !== "string") {
    return rpcError(
      id,
      JSONRPC_INVALID_PARAMS,
      "resources/read requires a string `uri`",
    );
  }
  if (!ctx.manifest || uri !== MANIFEST_URI) {
    return rpcError(id, MCP_RESOURCE_NOT_FOUND, "Resource not found", { uri });
  }
  return rpcOk(id, {
    contents: [{
      uri: MANIFEST_URI,
      mimeType: "application/json",
      text: JSON.stringify(ctx.manifest),
    }],
  });
}
