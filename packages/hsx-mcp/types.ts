/**
 * Shared types for @srdjan/hsx-mcp.
 *
 * @module types
 */

import type { AgentComponent } from "@srdjan/hsx-agent";
import type { ToolDefinition } from "@srdjan/hsx-widgets";

/** Options for creating an MCP handler. */
export type McpHandlerOptions = {
  /** Components to expose. Only those with an `.agent` descriptor become MCP tools. */
  readonly components: ReadonlyArray<AgentComponent>;
  /** Mount path for the single MCP endpoint. Default: "/mcp". */
  readonly basePath?: string;
  /** serverInfo.name in the initialize result. Default: "hsx-mcp". */
  readonly serverName?: string;
  /** serverInfo.version in the initialize result. Default: "0.1.0". */
  readonly serverVersion?: string;
  /** Optional `instructions` string returned from initialize. */
  readonly instructions?: string;
  /** Base origin for synthesized requests. Default: "http://localhost". */
  readonly origin?: string;
  /** Max characters of result HTML returned per tool call. Default: 4096. */
  readonly observationCap?: number;
  /**
   * Opt-in request authorization. Runs before any protocol handling.
   *
   * SECURITY: tools mutate real application state. Mounting the endpoint on
   * a publicly reachable server without `authorize` (or `bearerToken`) is
   * unsafe. Mutually exclusive with `bearerToken`.
   */
  readonly authorize?: (req: Request) => boolean | Promise<boolean>;
  /**
   * Convenience authorization: require `Authorization: Bearer <token>`
   * (constant-time compare). Mutually exclusive with `authorize`.
   */
  readonly bearerToken?: string;
  /**
   * Extra allowed values for the Origin header (DNS-rebinding guard).
   * Same-host origins and requests without an Origin header always pass.
   */
  readonly allowedOrigins?: ReadonlyArray<string>;
  /**
   * JSON-serializable manifest exposed as MCP resource `hsx://manifest`
   * (pass `createHsxManifest()` output from @srdjan/hsx-lens).
   */
  readonly manifest?: Readonly<Record<string, unknown>>;
};

/** The MCP handler interface - mounts into Deno.serve like the lens does. */
export type McpHandler = {
  /** The derived tool definitions (same shape componentsToTools returns). */
  readonly tools: ReadonlyArray<ToolDefinition>;
  /** Returns null when the request is not for basePath; otherwise a Response. */
  handle(req: Request): Promise<Response> | null;
};
