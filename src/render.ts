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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function isVNode(x: any): x is VNode {
  return x && typeof x.type !== "undefined" && "props" in x;
}

function renderNode(node: Renderable, ctx: RenderContext): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map((n) => renderNode(n, ctx)).join("");
  }

  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node));
  }

  if (!isVNode(node)) {
    return escapeHtml(String(node));
  }

  // Component
  if (typeof node.type === "function") {
    if (node.type === Fragment) {
      return renderNode(node.props.children, ctx);
    }
    const rendered = node.type(node.props);
    return renderNode(rendered as Renderable, ctx);
  }

  // Native element
  const tag = node.type;
  const rawProps = (node.props ?? {}) as Props;
  let props = rawProps;

  if (tag === "form") {
    props = normalizeFormProps(rawProps, ctx);
  } else if (tag === "button") {
    props = normalizeButtonProps(rawProps, ctx);
  } else if (tag === "a") {
    props = normalizeAnchorProps(rawProps, ctx);
  } else {
    props = normalizeGenericHsxProps(rawProps, ctx);
  }

  const attrs = propsToAttrs(props);
  const children = props.children as Renderable;

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrs}>`;
  }

  if (tag === "body") {
    const inner = renderNode(children, ctx);
    const script = ctx.usesHtmx
      ? `<script src="/static/htmx.js"></script>`
      : "";
    return `<body${attrs}>${inner}${script}</body>`;
  }

  const inner = renderNode(children, ctx);
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

export interface RenderHtmlOptions {
  maxDepth?: number;
  maxNodes?: number;
}

/**
 * Render a tree to a full HTML document string.
 * Caller is responsible for including <!DOCTYPE html> if desired.
 */
export function renderHtml(
  node: Renderable,
  _options: RenderHtmlOptions = {},
): string {
  const ctx: RenderContext = {
    depth: 0,
    nodes: 0,
    maxDepth: _options.maxDepth,
    maxNodes: _options.maxNodes,
    usesHtmx: false,
  };
  return renderNode(node, ctx);
}

/**
 * Convenience helper: wrap the rendered HTML in a Response.
 */
export function render(
  node: Renderable,
  _options: RenderHtmlOptions & { status?: number; headers?: HeadersInit } =
    {},
): Response {
  const html = renderHtml(node, _options);
  return new Response(html, {
    status: _options.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(typeof _options.headers === "object" ? _options.headers : {}),
    },
  });
}
