/**
 * Unit tests for HSX Widgets embed handler.
 *
 * Run with: deno test --allow-read --allow-net packages/hsx-widgets/embed/embed-handler.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createEmbedHandler, type EmbeddableWidget } from "./embed-handler.ts";

// =============================================================================
// Test Fixtures
// =============================================================================

const testWidget: EmbeddableWidget = {
  tag: "hsx-test",
  styles: ".hsx-test { color: red; }",
};

const noStyleWidget: EmbeddableWidget = {
  tag: "hsx-bare",
  styles: "",
};

function makeWidgets(
  ...pairs: Array<[string, EmbeddableWidget]>
): ReadonlyMap<string, EmbeddableWidget> {
  return new Map(pairs);
}

function makeHandler(
  widgets: ReadonlyMap<string, EmbeddableWidget> = makeWidgets(["hsx-test", testWidget]),
  options: { basePath?: string; bundlePath?: string } = {},
) {
  return createEmbedHandler(widgets, options);
}

function req(path: string): Request {
  return new Request(`http://localhost${path}`);
}

// =============================================================================
// Routing
// =============================================================================

Deno.test("returns null for non-matching paths", () => {
  const handler = makeHandler();
  assertEquals(handler(req("/other/path")), null);
});

Deno.test("returns null for base path without tag", () => {
  const handler = makeHandler();
  assertEquals(handler(req("/embed/")), null);
});

Deno.test("returns null for paths with nested segments", () => {
  const handler = makeHandler();
  assertEquals(handler(req("/embed/hsx-test/extra")), null);
});

Deno.test("returns 404 for unknown widget tag", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-unknown"));
  assertEquals(res?.status, 404);
  assertEquals(await res?.text(), "Widget not found");
});

// =============================================================================
// Successful Responses
// =============================================================================

Deno.test("returns 200 HTML shell for known widget", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-test?name=World"));

  assertEquals(res?.status, 200);
  assertEquals(res?.headers.get("content-type"), "text/html; charset=utf-8");

  const html = await res!.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, ".hsx-test { color: red; }");
});

Deno.test("query params appear in data-props attribute", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-test?name=World&count=5"));
  const html = await res!.text();

  assertStringIncludes(html, "data-props=");
  assertStringIncludes(html, "&quot;name&quot;");
  assertStringIncludes(html, "&quot;World&quot;");
});

Deno.test("bundle URL uses default bundlePath", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-test"));
  const html = await res!.text();

  assertStringIncludes(html, 'src="/static/hsx/hsx-test.js"');
});

Deno.test("CSP header is present", () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-test"));
  const csp = res?.headers.get("content-security-policy");

  assertEquals(typeof csp, "string");
  assertStringIncludes(csp!, "default-src 'self'");
});

Deno.test("cache-control header is present", () => {
  const handler = makeHandler();
  const res = handler(req("/embed/hsx-test"));

  assertEquals(res?.headers.get("cache-control"), "public, max-age=300");
});

// =============================================================================
// Custom Options
// =============================================================================

Deno.test("custom basePath routes correctly", () => {
  const handler = makeHandler(makeWidgets(["hsx-test", testWidget]), {
    basePath: "/widgets/embed",
  });

  assertEquals(handler(req("/embed/hsx-test")), null);
  assertEquals(handler(req("/widgets/embed/hsx-test"))?.status, 200);
});

Deno.test("custom bundlePath appears in script URL", async () => {
  const handler = makeHandler(makeWidgets(["hsx-test", testWidget]), {
    bundlePath: "/assets/widgets",
  });

  const res = handler(req("/embed/hsx-test"));
  const html = await res!.text();

  assertStringIncludes(html, 'src="/assets/widgets/hsx-test.js"');
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("widget with empty styles renders without extra CSS", async () => {
  const handler = makeHandler(makeWidgets(["hsx-bare", noStyleWidget]));
  const res = handler(req("/embed/hsx-bare"));
  const html = await res!.text();

  assertStringIncludes(html, "<!DOCTYPE html>");
  // The base reset styles are always present, but no widget-specific styles
  assertEquals(html.includes(".hsx-bare"), false);
});

Deno.test("special characters in query params are escaped", async () => {
  const handler = makeHandler();
  const res = handler(req('/embed/hsx-test?name=<script>alert(1)</script>'));
  const html = await res!.text();

  // Should be escaped in the data-props attribute
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertStringIncludes(html, "&lt;script&gt;");
});
