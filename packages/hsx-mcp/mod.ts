/**
 * HSX MCP - serve your HSX application as an MCP server.
 *
 * Mounts a Model Context Protocol endpoint (Streamable HTTP) into the app's
 * existing `Deno.serve`, exposing agent-callable `hsxComponent`s as MCP tools.
 * External MCP clients (Claude Code, Claude Desktop, ...) discover the tools
 * and drive the app's real endpoints; tool results carry the same rendered
 * HTML a human receives over HTMX.
 *
 * SECURITY: tools mutate real application state. Do not mount the endpoint
 * on a publicly reachable server without `authorize` or `bearerToken`.
 *
 * @example
 * ```ts
 * import { createMcpHandler } from "@srdjan/hsx-mcp";
 *
 * const mcp = createMcpHandler({ components: todoComponents });
 *
 * Deno.serve((req) => {
 *   const mcpResponse = mcp.handle(req);
 *   if (mcpResponse) return mcpResponse;
 *   // ... the app's own routes
 *   return new Response("Not found", { status: 404 });
 * });
 *
 * // Connect: claude mcp add --transport http my-app http://localhost:8000/mcp
 * ```
 *
 * @module
 */

export { createMcpHandler } from "./mcp-handler.ts";
export type { McpHandler, McpHandlerOptions } from "./types.ts";
