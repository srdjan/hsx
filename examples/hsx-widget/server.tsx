/**
 * HSX Widget Example Server
 *
 * Demonstrates a widget served in two modes:
 * 1. SSR mode - rendered through the HSX pipeline via widgetToHsxComponent
 * 2. Embed mode - served as an iframe-ready HTML shell with a Preact bundle
 *
 * Build assets first:
 *   deno task build:hsx-widgets
 *
 * Then run:
 *   deno task example:hsx-widget
 */

import { hsxPage } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import { widgetToHsxComponent } from "@srdjan/hsx-widgets/ssr";
import { greetingWidget } from "../../packages/hsx-widgets/examples/greeting-widget.tsx";
import { statusWidget } from "../../packages/hsx-widgets/examples/status-widget.tsx";
import { createEmbedHandler } from "../../packages/hsx-widgets/embed/embed-handler.ts";

// =============================================================================
// SSR Route - Widget rendered through HSX pipeline
// =============================================================================

const GreetingRoute = widgetToHsxComponent(greetingWidget, {
  path: "/widgets/greeting/:name",
});

const StatusRoute = widgetToHsxComponent(statusWidget, {
  path: "/widgets/status/:label",
});

// =============================================================================
// Embed Handler - Widget served as iframe shell
// =============================================================================

const widgets = new Map([
  ["hsx-greeting", greetingWidget],
  ["hsx-status", statusWidget],
]);

const embedHandler = createEmbedHandler(widgets, {
  basePath: "/embed",
  bundlePath: "/static/hsx",
});

// =============================================================================
// Page Layout
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HSX Widget Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <main>
        <h1>HSX Widget Demo</h1>

        <div class="card">
          <h2>SSR Mode</h2>
          <p>
            These widgets are rendered server-side through the HSX pipeline.
            Try: <a href="/widgets/greeting/World">/widgets/greeting/World</a>
            {" "}
            and
            {" "}
            <a href="/widgets/status/Build%20Healthy?tone=ok">/widgets/status/Build%20Healthy?tone=ok</a>
          </p>
        </div>

        <div class="card">
          <h2>Embed Mode</h2>
          <p>
            Widget shells are served for iframe embedding.
            Try:
            {" "}
            <a href="/embed/hsx-greeting?name=World&amp;message=Hi!">/embed/hsx-greeting?name=World&amp;message=Hi!</a>
            {" "}
            and
            {" "}
            <a href="/embed/hsx-status?label=Build%20Healthy&amp;tone=ok">/embed/hsx-status?label=Build%20Healthy&amp;tone=ok</a>
          </p>
          <p>
            Build client assets with <code>deno task build:hsx-widgets</code>, then
            use this on a third-party site:
          </p>
          <pre><code>{`<div data-hsx-uri="https://yoursite.com/embed/hsx-greeting?name=World"></div>
<div data-hsx-uri="https://yoursite.com/embed/hsx-status?label=Build%20Healthy&tone=ok"></div>
<script src="https://yoursite.com/static/hsx/snippet.js"></script>`}</code></pre>
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

  // Built HSX Widgets assets (dist/hsx)
  if (pathname.startsWith("/static/hsx/")) {
    const asset = pathname.slice("/static/hsx/".length);
    if (!asset || asset.includes("/") || asset.includes("..")) {
      return new Response("Not Found", { status: 404 });
    }

    const fileUrl = new URL(`../../dist/hsx/${asset}`, import.meta.url);
    return Deno.readTextFile(fileUrl).then(
      (js) => new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      }),
      () =>
        new Response(
          `// ${asset} not found. Run: deno task build:hsx-widgets`,
          {
            status: 404,
            headers: { "content-type": "text/javascript; charset=utf-8" },
          },
        ),
    );
  }

  // Home page
  if (pathname === "/") {
    return Page.render();
  }

  // SSR widget route
  if (GreetingRoute.match(pathname)) {
    return GreetingRoute.handle(req);
  }
  if (StatusRoute.match(pathname)) {
    return StatusRoute.handle(req);
  }

  // Embed handler
  const embedResponse = embedHandler(req);
  if (embedResponse) return embedResponse;

  return new Response("Not Found", { status: 404 });
});
