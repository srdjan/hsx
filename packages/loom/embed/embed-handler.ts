/**
 * Embed Handler - Serves widget embed pages and bundles.
 *
 * Creates a request handler that serves minimal HTML shells for embedding
 * widgets via iframes. Each shell loads the widget's compiled Preact bundle
 * and renders it in a self-contained page.
 *
 * @module embed-handler
 */

import type { Widget } from "../widget.ts";

// =============================================================================
// Types
// =============================================================================

/** Minimal widget shape needed by the embed handler (tag + styles only). */
export type EmbeddableWidget = Pick<Widget<unknown>, "tag" | "styles">;

export type EmbedHandlerOptions = {
  /** Base path for embed routes. Defaults to "/embed". */
  readonly basePath?: string;
  /** Base URL for bundle assets. Defaults to "/static/loom". */
  readonly bundlePath?: string;
};

// =============================================================================
// HTML Shell
// =============================================================================

/**
 * Generate a minimal HTML shell for embedding a widget.
 * The shell loads the widget's compiled bundle and passes params via data attributes.
 */
function embedShell(
  tag: string,
  params: Record<string, string>,
  styles: string,
  bundleUrl: string,
): string {
  const propsJson = JSON.stringify(params)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif}
  ${styles}
</style>
</head>
<body>
<div id="root" data-props="${propsJson}"></div>
<script type="module" src="${bundleUrl}"></script>
<script>
// Height negotiation: inform parent iframe of content height
const ro = new ResizeObserver(() => {
  const h = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "loom-resize", tag: "${tag}", height: h }, "*");
});
ro.observe(document.body);
</script>
</body>
</html>`;
}

// =============================================================================
// Handler Factory
// =============================================================================

/**
 * Create a request handler that serves widget embed pages.
 *
 * Routes:
 * - `GET {basePath}/{tag}` - Serves the HTML shell for the widget
 * - Query params are passed to the widget as initial props
 *
 * @example
 * ```ts
 * const widgets = new Map([["loom-greeting", greetingWidget]]);
 * const embedHandler = createEmbedHandler(widgets, {
 *   basePath: "/embed",
 *   bundlePath: "/static/loom",
 * });
 *
 * // In your server:
 * if (url.pathname.startsWith("/embed/")) {
 *   return embedHandler(req);
 * }
 * ```
 */
export function createEmbedHandler(
  widgets: ReadonlyMap<string, EmbeddableWidget>,
  options: EmbedHandlerOptions = {},
): (req: Request) => Response | null {
  const basePath = (options.basePath ?? "/embed").replace(/\/$/, "");
  const bundlePath = (options.bundlePath ?? "/static/loom").replace(/\/$/, "");

  return (req: Request): Response | null => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Match /embed/{tag}
    const prefix = `${basePath}/`;
    if (!pathname.startsWith(prefix)) return null;

    const tag = pathname.slice(prefix.length);
    if (!tag || tag.includes("/")) return null;

    const widget = widgets.get(tag);
    if (!widget) {
      return new Response("Widget not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Collect query params
    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }

    const bundleUrl = `${bundlePath}/${tag}.js`;
    const html = embedShell(tag, params, widget.styles, bundleUrl);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "content-security-policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      },
    });
  };
}
