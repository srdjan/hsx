/**
 * Loom Widget Example Server
 *
 * Demonstrates a widget served in two modes:
 * 1. SSR mode - rendered through the HSX pipeline via widgetToHsxComponent
 * 2. Embed mode - served as an iframe-ready HTML shell with a Preact bundle
 *
 * Run with: deno run --allow-net --allow-read examples/loom-widget/server.tsx
 */

import { hsxPage } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import { widgetToHsxComponent } from "@srdjan/loom/ssr";
import { greetingWidget } from "../../packages/loom/examples/greeting-widget.tsx";
import { createEmbedHandler } from "../../packages/loom/embed/embed-handler.ts";

// =============================================================================
// SSR Route - Widget rendered through HSX pipeline
// =============================================================================

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
});

// =============================================================================
// Embed Handler - Widget served as iframe shell
// =============================================================================

const widgets = new Map<string, typeof greetingWidget>([
  ["loom-greeting", greetingWidget],
]);

const embedHandler = createEmbedHandler(widgets, {
  basePath: "/embed",
  bundlePath: "/static/loom",
});

// =============================================================================
// Page Layout
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Loom Widget Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <main>
        <h1>Loom Widget Demo</h1>

        <div class="card">
          <h2>SSR Mode</h2>
          <p>
            The widget below is rendered server-side through the HSX pipeline.
            Try: <a href="/widgets/greeting/World">/widgets/greeting/World</a>
          </p>
        </div>

        <div class="card">
          <h2>Embed Mode</h2>
          <p>
            The widget below would be served as an iframe shell for embedding.
            Try: <a href="/embed/loom-greeting?name=World&amp;message=Hi!">/embed/loom-greeting?name=World&amp;message=Hi!</a>
          </p>
          <p>
            On a third-party site, you would use:
          </p>
          <pre><code>{`<div data-loom-uri="https://yoursite.com/embed/loom-greeting?name=World"></div>
<script src="https://yoursite.com/static/loom/snippet.js"></script>`}</code></pre>
        </div>
      </main>
    </body>
  </html>
));

// =============================================================================
// Server
// =============================================================================

Deno.serve((req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // Static assets
  if (pathname === "/static/htmx.js") {
    return Deno.readTextFile(
      new URL("../../vendor/htmx/htmx.js", import.meta.url),
    ).then(
      (js) => new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      }),
      () => new Response("// htmx.js not found", {
        status: 500,
        headers: { "content-type": "text/javascript" },
      }),
    );
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  // Home page
  if (pathname === "/") {
    return Page.render();
  }

  // SSR widget route
  if (GreetingRoute.match(pathname)) {
    return GreetingRoute.handle(req);
  }

  // Embed handler
  const embedResponse = embedHandler(req);
  if (embedResponse) return embedResponse;

  return new Response("Not Found", { status: 404 });
});
