import { renderHtml } from "./render.ts";
import { isVNode } from "./jsx-runtime.ts";
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
  "g",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "textPath",
  "defs",
  "symbol",
  "use",
  "marker",
  "clipPath",
  "mask",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feMerge",
  "feMergeNode",
  "feBlend",
  "feColorMatrix",
  "foreignObject",
  "button",
  "form",
  "label",
  "input",
  "textarea",
  "select",
  "option",
  "optgroup",
  "meter",
  "output",
  "progress",
  "dialog",
  "details",
  "summary",
  "template",
  "slot",
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
  "mark",
  "abbr",
  "data",
  "br",
  "wbr",
  "hr",
  "col",
  "colgroup",
]);

const ALLOWED_TAGS = new Set<string>([
  ...SEMANTIC_TAGS,
  ...STANDARD_PAGE_TAGS,
  ...NON_SEMANTIC_TAGS,
]);

function childrenOf(node: VNode): Renderable[] {
  const c = (node.props as Record<string, unknown>).children as Renderable;
  if (c === null || c === undefined || c === false || c === true) return [];
  return Array.isArray(c) ? c : [c];
}

function pathString(ancestors: ReadonlyArray<string>, current?: string): string {
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

/**
 * onElement callback for renderHtml that enforces hsxPage structural rules.
 * Called once per element during the single render pass - no double execution.
 */
function validateElement(
  tag: string,
  props: Record<string, unknown>,
  ancestors: ReadonlyArray<string>,
): void {
  // Tag whitelist
  if (!ALLOWED_TAGS.has(tag)) {
    throw new Error(
      `Element <${tag}> is not allowed in hsxPage. Use semantic HTML, standard head/body tags, or HSX components. Path: ${pathString(ancestors, tag)}`,
    );
  }

  // Semantic tags cannot have class or style
  if (SEMANTIC_TAGS.has(tag)) {
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

  // <style> must be inside <head>
  if (tag === "style") {
    const parent = ancestors[ancestors.length - 1];
    if (parent !== "head") {
      throw new Error("<style> tags must live inside <head> when using hsxPage");
    }
  }
}

export interface HsxPageOptions {
  /**
   * When true, skips validation on subsequent renders after the first.
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
 * Create a full-page HSX component with strict structural and styling rules.
 *
 * Validation happens during the render pass itself via an onElement callback,
 * so components execute exactly once - no double-rendering.
 */
export function hsxPage(renderFn: () => Renderable, options: HsxPageOptions = {}): HsxPage {
  const { validateOnce = false } = options;
  let validated = false;

  const Component: ComponentType = (_props) => {
    const tree = renderFn();
    if (!isVNode(tree)) {
      throw new Error("hsxPage render function must return a single <html> VNode");
    }

    // Skeleton check (head/body order) runs on the VNode tree directly -
    // no component invocation needed, just inspects VNode.type strings
    if (!validateOnce || !validated) {
      assertHtmlSkeleton(tree);
    }

    return tree;
  };

  return {
    Component,
    render(): Response {
      const shouldValidate = !validateOnce || !validated;
      const tree = renderFn();
      if (!isVNode(tree)) {
        throw new Error("hsxPage render function must return a single <html> VNode");
      }
      if (shouldValidate) {
        assertHtmlSkeleton(tree);
      }

      const html = renderHtml(tree, {
        onElement: shouldValidate ? validateElement : undefined,
      });

      validated = true;
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  };
}
