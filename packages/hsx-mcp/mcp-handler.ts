/**
 * createMcpHandler - mount an MCP endpoint into an existing Deno.serve.
 *
 * Speaks MCP Streamable HTTP in its simplest conforming form: one endpoint,
 * POST-only, plain JSON responses, stateless (no Mcp-Session-Id). GET gets a
 * 405 because this server never initiates messages, which the spec permits.
 * The handshake is lenient - tools/call before initialize is allowed, since
 * without sessions there is nothing to enforce it against; access control is
 * the job of `authorize`/`bearerToken`, not protocol ceremony.
 *
 * SECURITY: tools mutate real application state. Do not mount the endpoint
 * on a publicly reachable server without `authorize` or `bearerToken`.
 *
 * @module mcp-handler
 */

import {
  JSONRPC_INVALID_REQUEST,
  JSONRPC_PARSE_ERROR,
  parseMessage,
  rpcError,
} from "./jsonrpc.ts";
import { createProtocolContext, dispatch } from "./protocol.ts";
import type { McpHandler, McpHandlerOptions } from "./types.ts";

function normalizeBasePath(path: string): string {
  const withLead = path.startsWith("/") ? path : `/${path}`;
  return withLead.length > 1 && withLead.endsWith("/")
    ? withLead.slice(0, -1)
    : withLead;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Constant-time string comparison (length mismatch short-circuits; that leak is benign). */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function makeAuthorizer(
  options: McpHandlerOptions,
): (req: Request) => boolean | Promise<boolean> {
  if (options.authorize && options.bearerToken !== undefined) {
    throw new Error("Provide either `authorize` or `bearerToken`, not both.");
  }
  if (options.authorize) return options.authorize;
  const token = options.bearerToken;
  if (token === undefined) return () => true;
  if (token.length === 0) throw new Error("bearerToken must not be empty.");
  return (req) => {
    const header = req.headers.get("authorization") ?? "";
    const prefix = "Bearer ";
    return header.startsWith(prefix) &&
      timingSafeEqual(header.slice(prefix.length), token);
  };
}

/**
 * DNS-rebinding guard: when a browser sends an Origin header, its host must
 * match the request host or be explicitly allow-listed. MCP CLIs send no
 * Origin header and pass through.
 */
function originAllowed(
  req: Request,
  allowed: ReadonlySet<string>,
): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (allowed.has(origin)) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/**
 * Create an MCP handler exposing agent-callable components as MCP tools.
 *
 * Mounts like the lens: `handle()` returns null when the request is not for
 * `basePath`, so it drops into an existing Deno.serve routing chain.
 */
export function createMcpHandler(options: McpHandlerOptions): McpHandler {
  const authorize = makeAuthorizer(options);
  const basePath = normalizeBasePath(options.basePath ?? "/mcp");
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const ctx = createProtocolContext(options);

  async function respond(req: Request): Promise<Response> {
    if (!(await authorize(req))) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "www-authenticate": "Bearer" },
      });
    }
    if (!originAllowed(req, allowedOrigins)) {
      return new Response("Forbidden", { status: 403 });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "POST" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(rpcError(null, JSONRPC_PARSE_ERROR, "Parse error"), 400);
    }

    const message = parseMessage(body);
    switch (message.tag) {
      case "notification":
        // Per Streamable HTTP: bodies without an id get 202, no content.
        return new Response(null, { status: 202 });
      case "batch":
        return json(
          rpcError(
            null,
            JSONRPC_INVALID_REQUEST,
            "JSON-RPC batching is not supported",
          ),
          400,
        );
      case "invalid":
        return json(rpcError(null, message.code, message.message), 400);
      case "request":
        return json(
          await dispatch(ctx, message.id, message.method, message.params),
          200,
        );
    }
  }

  return {
    tools: ctx.tools,

    handle(req: Request): Promise<Response> | null {
      const { pathname } = new URL(req.url);
      if (pathname !== basePath && pathname !== `${basePath}/`) return null;
      return respond(req);
    },
  };
}
