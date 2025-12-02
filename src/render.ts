import type { Renderable, VNode } from "./jsx-runtime.ts";
import { Fragment } from "./jsx-runtime.ts";
import {
  type RenderContext,
  type Props,
  normalizeFormProps,
  normalizeButtonProps,
  normalizeAnchorProps,
  normalizeGenericHsxProps,
} from "./hsx-normalize.ts";

const VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input","link",
  "meta","param","source","track","wbr"
]);

/** Map of characters to their HTML entity equivalents */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ESCAPE_RE = /[&<>"']/g;

/**
 * Escape HTML special characters in text content.
 * Uses single-pass regex for performance.
 */
function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Escape characters for safe use in HTML attributes.
 * Includes single quote escaping for attributes using single quotes.
 */
function escapeAttr(text: string): string {
  return escapeHtml(text);
}

function propsToAttrs(props: Props): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (
      key === "children" ||
      value === undefined ||
      value === null ||
      typeof value === "function"
    ) continue;

    const attrName = key === "className" ? "class" : key;

    if (typeof value === "boolean") {
      if (value) parts.push(` ${attrName}`);
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      parts.push(` ${attrName}="${escapeAttr(String(value))}"`);
      continue;
    }

    // Fallback: JSON stringify for objects (hx-vals, hx-headers, etc.)
    parts.push(
      ` ${attrName}="${escapeAttr(JSON.stringify(value))}"`,
    );
  }
  return parts.join("");
}

function isVNode(x: unknown): x is VNode {
  return (
    typeof x === "object" &&
    x !== null &&
    "type" in x &&
    "props" in x
  );
}

/**
 * Enforce render limits to prevent DoS attacks.
 * Throws if maxDepth or maxNodes is exceeded.
 */
function enforceLimits(ctx: RenderContext): void {
  if (ctx.maxDepth !== undefined && ctx.depth >= ctx.maxDepth) {
    throw new Error(`Maximum render depth exceeded: ${ctx.maxDepth}`);
  }
  if (ctx.maxNodes !== undefined && ctx.nodes >= ctx.maxNodes) {
    throw new Error(`Maximum node count exceeded: ${ctx.maxNodes}`);
  }
  ctx.nodes++;
}

/**
 * Normalize props based on element type.
 * Maps HSX attributes to hx-* attributes.
 */
function normalizeProps(tag: string, props: Props, ctx: RenderContext): Props {
  switch (tag) {
    case "form":
      return normalizeFormProps(props, ctx);
    case "button":
      return normalizeButtonProps(props, ctx);
    case "a":
      return normalizeAnchorProps(props, ctx);
    default:
      return normalizeGenericHsxProps(props, ctx);
  }
}

/**
 * Render a function component (including Fragment).
 */
function renderComponent(node: VNode, ctx: RenderContext): string {
  ctx.depth++;
  try {
    if (node.type === Fragment) {
      return renderNode(node.props.children, ctx);
    }
    const component = node.type as (props: unknown) => Renderable;
    const rendered = component(node.props);
    return renderNode(rendered, ctx);
  } finally {
    ctx.depth--;
  }
}

/**
 * Render a native HTML element.
 */
function renderElement(node: VNode, ctx: RenderContext): string {
  const tag = node.type as string;
  const rawProps = (node.props ?? {}) as Props;
  const props = normalizeProps(tag, rawProps, ctx);
  const attrs = propsToAttrs(props);
  const children = props.children as Renderable;

  // Void elements have no children or closing tag
  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrs}>`;
  }

  // Render children with incremented depth
  ctx.depth++;
  try {
    const inner = renderNode(children, ctx);

    // Special handling for <body>: inject HTMX script if needed
    if (tag === "body") {
      const script = ctx.usesHtmx
        ? `<script src="/static/htmx.js"></script>`
        : "";
      return `<body${attrs}>${inner}${script}</body>`;
    }

    return `<${tag}${attrs}>${inner}</${tag}>`;
  } finally {
    ctx.depth--;
  }
}

/**
 * Render a node (element, component, or primitive) to an HTML string.
 */
function renderNode(node: Renderable, ctx: RenderContext): string {
  enforceLimits(ctx);

  // Primitives: null, undefined, boolean render as empty
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  // Arrays: render each child and concatenate
  if (Array.isArray(node)) {
    return node.map((n) => renderNode(n, ctx)).join("");
  }

  // Text: escape and return
  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node));
  }

  // Non-VNode objects: convert to string and escape
  if (!isVNode(node)) {
    return escapeHtml(String(node));
  }

  // Function components
  if (typeof node.type === "function") {
    return renderComponent(node, ctx);
  }

  // Native HTML elements
  return renderElement(node, ctx);
}

/**
 * Options for controlling the rendering process.
 */
export interface RenderHtmlOptions {
  /**
   * Maximum nesting depth allowed before throwing an error.
   * Prevents stack overflow from deeply nested component trees.
   * @default undefined (no limit)
   */
  maxDepth?: number;

  /**
   * Maximum number of nodes to render before throwing an error.
   * Prevents DoS attacks from extremely large trees.
   * @default undefined (no limit)
   */
  maxNodes?: number;
}

/**
 * Render a JSX tree to an HTML string.
 *
 * Processes the JSX tree, normalizes HSX attributes to hx-* attributes,
 * and automatically injects the HTMX script tag when HTMX features are used.
 *
 * Note: Does NOT include `<!DOCTYPE html>`. Add it manually if needed.
 *
 * @param node - The JSX element or component to render
 * @param options - Rendering options (maxDepth, maxNodes)
 * @returns The rendered HTML string
 *
 * @throws {Error} If maxDepth is exceeded
 * @throws {Error} If maxNodes is exceeded
 *
 * @example
 * ```tsx
 * function Page() {
 *   return (
 *     <html>
 *       <body>
 *         <h1>Hello</h1>
 *         <button get="/api/data">Load</button>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * const html = renderHtml(<Page />);
 * // Returns: <html><body><h1>Hello</h1><button hx-get="/api/data">Load</button><script src="/static/htmx.js"></script></body></html>
 * ```
 */
export function renderHtml(
  node: Renderable,
  options: RenderHtmlOptions = {},
): string {
  const ctx: RenderContext = {
    depth: 0,
    nodes: 0,
    maxDepth: options.maxDepth,
    maxNodes: options.maxNodes,
    usesHtmx: false,
  };
  return renderNode(node, ctx);
}

/**
 * Render a JSX tree directly to an HTTP Response.
 *
 * Convenience wrapper around `renderHtml` that returns a Response object
 * suitable for use with Deno.serve() or similar HTTP frameworks.
 *
 * @param node - The JSX element or component to render
 * @param options - Rendering and response options
 * @param options.status - HTTP status code (default: 200)
 * @param options.headers - Additional headers to include
 * @param options.maxDepth - Maximum nesting depth
 * @param options.maxNodes - Maximum node count
 * @returns HTTP Response with HTML content
 *
 * @example
 * ```tsx
 * Deno.serve((_req) => render(<Page />));
 *
 * // With custom status:
 * return render(<NotFound />, { status: 404 });
 *
 * // With custom headers:
 * return render(<Page />, {
 *   headers: { "X-Custom-Header": "value" }
 * });
 * ```
 */
export function render(
  node: Renderable,
  options: RenderHtmlOptions & { status?: number; headers?: HeadersInit } = {},
): Response {
  const html = renderHtml(node, options);
  return new Response(html, {
    status: options.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(typeof options.headers === "object" ? options.headers : {}),
    },
  });
}
