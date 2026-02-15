import { render as renderResponse } from "./render.ts";
import type { ComponentType, Renderable, VNode } from "./jsx-runtime.ts";

// Semantic elements that must remain free of class/style for structural purity
const SEMANTIC_TAGS = new Set([
  "header",
  "main",
  "nav",
  "section",
  "article",
  "aside",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "address",
  "time",
  "blockquote",
  "q",
  "cite",
]);

// Core document tags allowed at the top level / head
const STANDARD_PAGE_TAGS = new Set([
  "html",
  "head",
  "body",
  "meta",
  "title",
  "link",
  "script",
  "style",
]);

// Non-semantic tags we still allow (may carry class/style)
const NON_SEMANTIC_TAGS = new Set([
  "a",
  "div",
  "span",
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "canvas",
  "svg",
  "path",
  "g",
  "button",
  "form",
  "label",
  "input",
  "textarea",
  "select",
  "option",
  "optgroup",
  "progress",
  "details",
  "summary",
  "fieldset",
  "legend",
  "code",
  "pre",
  "kbd",
  "samp",
  "strong",
  "em",
  "small",
  "sup",
  "sub",
  "br",
  "hr",
  "col",
  "colgroup",
]);

const ALLOWED_TAGS = new Set<string>([
  ...SEMANTIC_TAGS,
  ...STANDARD_PAGE_TAGS,
  ...NON_SEMANTIC_TAGS,
]);

type Ancestors = string[];

function isVNode(value: unknown): value is VNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "props" in value
  );
}

function childrenOf(node: VNode): Renderable[] {
  const c = (node.props as Record<string, unknown>).children as Renderable;
  if (c === null || c === undefined || c === false || c === true) return [];
  return Array.isArray(c) ? c : [c];
}

function componentName(fn: ComponentType): string {
  return fn.name || "(anonymous component)";
}

function pathString(ancestors: Ancestors, current?: string): string {
  const parts = [...ancestors];
  if (current) parts.push(current);
  return parts.length ? parts.join(" > ") : "<root>";
}

function assertHtmlSkeleton(root: VNode): void {
  if (root.type !== "html") {
    throw new Error("hsxPage must return a root <html> element");
  }

  const kids = childrenOf(root).filter(isVNode);
  const head = kids.find((k) => k.type === "head");
  const body = kids.find((k) => k.type === "body");

  if (!head || !body) {
    throw new Error("hsxPage requires both <head> and <body> as children of <html>");
  }

  const headIndex = kids.indexOf(head);
  const bodyIndex = kids.indexOf(body);
  if (headIndex > bodyIndex) {
    throw new Error("<head> must appear before <body> inside <html>");
  }
}

function validateSemanticAttrs(tag: string, props: Record<string, unknown>, ancestors: Ancestors): void {
  if (!SEMANTIC_TAGS.has(tag)) return;
  if (props.class !== undefined || props.className !== undefined) {
    throw new Error(
      `Semantic element <${tag}> cannot have a class. Offending path: ${pathString(ancestors, tag)}`,
    );
  }
  if (props.style !== undefined) {
    throw new Error(
      `Semantic element <${tag}> cannot have inline style. Offending path: ${pathString(ancestors, tag)}`,
    );
  }
}

function validateStylePlacement(tag: string, ancestors: Ancestors): void {
  if (tag !== "style") return;
  const parent = ancestors[ancestors.length - 1];
  if (parent !== "head") {
    throw new Error("<style> tags must live inside <head> when using hsxPage");
  }
}

function validateTagAllowed(tag: string, ancestors: Ancestors): void {
  if (ALLOWED_TAGS.has(tag)) return;
  throw new Error(
    `Element <${tag}> is not allowed in hsxPage. Use semantic HTML, standard head/body tags, or HSX components. Path: ${pathString(ancestors, tag)}`,
  );
}

function validateNode(node: Renderable, ancestors: Ancestors = [], depth = 0): void {
  if (depth > 2000) {
    throw new Error("hsxPage validation exceeded depth limit (possible infinite recursion)");
  }

  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") return;

  if (Array.isArray(node)) {
    for (const child of node) validateNode(child, ancestors, depth + 1);
    return;
  }

  if (!isVNode(node)) {
    // Unknown renderable - ignore silently
    return;
  }

  if (typeof node.type === "function") {
    const name = componentName(node.type as ComponentType);
    const rendered = (node.type as ComponentType)(node.props);

    // Detect async components which are not supported in hsxPage
    if (rendered instanceof Promise) {
      throw new Error(
        `Async components are not supported in hsxPage. ` +
        `Component "${name}" returned a Promise. ` +
        `Use synchronous components or fetch data before rendering.`
      );
    }

    validateNode(rendered, ancestors.concat([name]), depth + 1);
    return;
  }

  const tag = node.type as string;

  // Root-specific enforcement
  if (ancestors.length === 0) {
    if (tag !== "html") {
      throw new Error("hsxPage must return a root <html> element");
    }
    assertHtmlSkeleton(node);
  }

  validateTagAllowed(tag, ancestors);
  validateSemanticAttrs(tag, node.props as Record<string, unknown>, ancestors);
  validateStylePlacement(tag, ancestors);

  const children = childrenOf(node);
  for (const child of children) {
    validateNode(child, ancestors.concat([tag]), depth + 1);
  }
}

export interface HsxPageOptions {
  /**
   * When true, validates the tree only on the first render and caches the result.
   * Useful for pages with static structure where validation on every render is unnecessary.
   * @default false
   */
  validateOnce?: boolean;
}

export interface HsxPage {
  /** The validated page component (use in JSX: <Page.Component />) */
  Component: ComponentType;
  /** Convenience helper to render a full Response */
  render(): Response;
}

/**
 * Create a full-page HSX component with strict structural & styling rules.
 */
export function hsxPage(renderFn: () => Renderable, options: HsxPageOptions = {}): HsxPage {
  const { validateOnce = false } = options;
  let validated = false;

  const Component: ComponentType = (_props) => {
    const tree = renderFn();
    if (!isVNode(tree)) {
      throw new Error("hsxPage render function must return a single <html> VNode");
    }
    if (!validateOnce || !validated) {
      validateNode(tree);
      validated = true;
    }
    return tree;
  };

  return {
    Component,
    render: () => renderResponse(Component({})),
  };
}
