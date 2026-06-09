/**
 * toRequest - synthesize a Request from AI tool-call arguments.
 *
 * The agent calls a tool with a flat object of arguments. This splits those
 * arguments into path parameters (named in the route) and body fields, then
 * builds a Request the component's own `handle()` can serve - the same code
 * path a human's HTMX request would take. Path params go in the URL; the rest
 * become a urlencoded body (so `req.formData()` works) for mutations, or query
 * params for GET.
 *
 * @module request-build
 */

import type { AgentComponent } from "./types.ts";

const PARAM_RE = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

function paramNamesOf(path: string): Set<string> {
  return new Set(Array.from(path.matchAll(PARAM_RE), (m) => m[1]));
}

/** Coerce a tool-call argument value to a form/query string value. */
function toFieldValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Build a Request that drives `component.handle()` from tool-call `args`.
 *
 * Runs the component's `input.assert` guard first (if present); a throw
 * propagates so the caller can surface it as a tool error.
 */
export function toRequest(
  component: AgentComponent,
  args: Record<string, unknown>,
  origin: string,
): Request {
  component.agent?.assert?.(args);

  const pathNames = paramNamesOf(component.path);
  const pathParams: Record<string, unknown> = {};
  const bodyFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    if (pathNames.has(key)) {
      pathParams[key] = value;
    } else {
      bodyFields[key] = toFieldValue(value);
    }
  }

  const method = component.agent?.method ?? component.methods[0] ?? "GET";
  const url = new URL(component.build(pathParams), origin);

  if (method === "GET") {
    for (const [key, value] of Object.entries(bodyFields)) {
      url.searchParams.set(key, value);
    }
    return new Request(url, { method });
  }

  const body = new URLSearchParams(bodyFields);
  return new Request(url, {
    method,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}
