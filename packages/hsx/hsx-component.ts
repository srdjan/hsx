/**
 * HSX Component - Co-located route, handler, and component definitions.
 *
 * An HSX Component bundles:
 * - A type-safe route definition
 * - A request handler that produces props
 * - A render function that consumes those props
 *
 * The type system ensures handler output matches component props at compile time.
 *
 * @module hsx-component
 */

import type { Renderable } from "./jsx-runtime.ts";
import { render as renderResponse, renderHtml } from "./render.ts";
import type { ParamsFromPath, Route } from "./hsx-types.ts";

// =============================================================================
// Types
// =============================================================================

/** HTTP methods supported by HSX Components */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Options for creating an HSX Component.
 *
 * @typeParam Params - Path parameters extracted from the route
 * @typeParam Props - The props type for the render function
 */
export interface HsxComponentOptions<Params, Props> {
  /**
   * HTTP methods this component handles.
   * @default ["GET"]
   */
  methods?: HttpMethod[];

  /**
   * Handler function that processes the request and returns props.
   * The props returned MUST match the render function's expected props.
   */
  handler: (req: Request, params: Params) => Props | Promise<Props>;

  /**
   * Render function that produces JSX from props.
   * Props type is enforced to match handler return type.
   */
  render: (props: Props) => Renderable;

  /**
   * If true, wraps response with full HTML document response.
   * If false (default), returns just the HTML fragment.
   * @default false
   */
  fullPage?: boolean;

  /**
   * HTTP status code for the response.
   * @default 200
   */
  status?: number;

  /**
   * Additional headers for the response.
   */
  headers?: HeadersInit;
}

/**
 * An HSX Component combines a Route with a handler and renderer.
 *
 * It can be used:
 * - As a Route in JSX attributes: `<button get={MyComponent}>`
 * - As a handler: `MyComponent.handle(req)`
 * - For pattern matching: `MyComponent.match(pathname)`
 * - For testing: `<MyComponent.Component {...props} />`
 */
export interface HsxComponent<
  Path extends string,
  Params = ParamsFromPath<Path>,
  Props = unknown,
> extends Route<Path, Params> {
  /**
   * Handle an incoming request and return a Response.
   * Automatically extracts params, calls handler, and renders.
   */
  handle(req: Request): Promise<Response>;

  /**
   * Match a pathname against this component's route.
   * Returns extracted params if matched, null otherwise.
   */
  match(pathname: string): Params | null;

  /**
   * The raw render component for testing or composition.
   */
  Component: (props: Props) => Renderable;

  /**
   * HTTP methods this component handles.
   */
  readonly methods: readonly HttpMethod[];
}

// =============================================================================
// Path Matching
// =============================================================================

/**
 * Convert a path pattern to a regex for matching.
 * Handles :param patterns.
 */
function pathToRegex(path: string): RegExp {
  const pattern = path
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "([^/]+)"); // :param → capture group
  return new RegExp(`^${pattern}$`);
}

/**
 * Extract parameter names from a path pattern.
 */
function extractParamNames(path: string): string[] {
  const matches = path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Match a pathname against a pattern and extract params.
 */
function matchPath<Params>(
  pattern: string,
  pathname: string,
): Params | null {
  const regex = pathToRegex(pattern);
  const match = pathname.match(regex);
  if (!match) return null;

  const names = extractParamNames(pattern);
  const params: Record<string, string> = {};
  names.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return params as Params;
}

// =============================================================================
// hsxComponent Factory
// =============================================================================

/**
 * Create an HSX Component that co-locates route, handler, and render function.
 *
 * @example
 * ```tsx
 * const TodoList = hsxComponent("/todos", {
 *   methods: ["GET", "POST"],
 *
 *   async handler(req) {
 *     if (req.method === "POST") {
 *       const form = await req.formData();
 *       await addTodo(String(form.get("text")));
 *     }
 *     return { todos: await getTodos() };
 *   },
 *
 *   render({ todos }) {
 *     return (
 *       <ul id="todo-list">
 *         {todos.map(t => <li>{t.text}</li>)}
 *       </ul>
 *     );
 *   }
 * });
 *
 * // Use as route in JSX:
 * <form post={TodoList} target="#todo-list">
 *
 * // Use as handler:
 * if (TodoList.match(pathname)) return TodoList.handle(req);
 * ```
 */
export function hsxComponent<
  Path extends string,
  Props,
  Params = ParamsFromPath<Path>,
>(
  path: Path,
  options: HsxComponentOptions<Params, Props>,
): HsxComponent<Path, Params, Props> {
  const {
    methods = ["GET"],
    handler,
    render: renderFn,
    fullPage = false,
    status = 200,
    headers = {},
  } = options;

  // Precompute path regex and param names (fixed per component, no need to recompute)
  const pathRegex = pathToRegex(path);
  const paramNames = extractParamNames(path);

  // Validate no duplicate parameter names
  const seen = new Set<string>();
  for (const name of paramNames) {
    if (seen.has(name)) {
      throw new Error(
        `Duplicate path parameter ":${name}" in route "${path}". ` +
        `Each parameter name must be unique.`
      );
    }
    seen.add(name);
  }

  // Build function for Route compatibility
  // Validates all required params are provided and URL-encodes values
  const build = (params: Params): string => {
    const missing: string[] = [];
    let result = (path as string).replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_, name) => {
        if (params && typeof params === "object" && name in params) {
          const value = (params as Record<string, unknown>)[name];
          // URL-encode the value to prevent path traversal and injection
          return encodeURIComponent(String(value));
        }
        missing.push(name);
        return `:${name}`;
      }
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing required route parameters: ${missing.join(", ")}. ` +
        `Route "${path}" requires these parameters to build a URL.`
      );
    }

    return result;
  };

  // Match function using precomputed regex and param names
  const match = (pathname: string): Params | null => {
    const m = pathname.match(pathRegex);
    if (!m) return null;
    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => {
      params[name] = m[i + 1];
    });
    return params as Params;
  };

  // Handle function - the core of the component
  const handle = async (req: Request): Promise<Response> => {
    try {
      // Enforce allowed HTTP methods
      if (!methods.includes(req.method as HttpMethod)) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            "allow": methods.join(", "),
            "content-type": "text/plain; charset=utf-8",
          },
        });
      }

      const url = new URL(req.url);
      const params = match(url.pathname);

      if (params === null) {
        return new Response("Not Found", { status: 404 });
      }

      // Call handler to get props
      const props = await handler(req, params);

      // Render with the component
      const rendered = renderFn(props);

      if (fullPage) {
        return renderResponse(rendered, { status, headers });
      }

      const html = renderHtml(rendered);
      return new Response(html, {
        status,
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...(typeof headers === "object" && !Array.isArray(headers)
            ? headers
            : {}),
        },
      });
    } catch (error) {
      // Log error for debugging (in production, use proper logging)
      console.error(`[HSX] Error handling ${req.method} ${req.url}:`, error);

      // Return a generic error response to avoid leaking internal details
      return new Response("Internal Server Error", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  };

  // Create the component object
  const component: HsxComponent<Path, Params, Props> = {
    path,
    build,
    handle,
    match,
    Component: renderFn,
    methods: Object.freeze([...methods]),
  };

  return component;
}
