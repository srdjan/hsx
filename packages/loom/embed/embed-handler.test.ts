/**
 * Unit tests for Loom embed handler.
 *
 * Run with: deno test --allow-read --allow-net packages/loom/embed/embed-handler.test.ts
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
  tag: "loom-test",
  styles: ".loom-test { color: red; }",
};

const noStyleWidget: EmbeddableWidget = {
  tag: "loom-bare",
  styles: "",
};

function makeWidgets(
  ...pairs: Array<[string, EmbeddableWidget]>
): ReadonlyMap<string, EmbeddableWidget> {
  return new Map(pairs);
}

function makeHandler(
  widgets: ReadonlyMap<string, EmbeddableWidget> = makeWidgets(["loom-test", testWidget]),
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
  assertEquals(handler(req("/embed/loom-test/extra")), null);
});

Deno.test("returns 404 for unknown widget tag", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-unknown"));
  assertEquals(res?.status, 404);
  assertEquals(await res?.text(), "Widget not found");
});

// =============================================================================
// Successful Responses
// =============================================================================

Deno.test("returns 200 HTML shell for known widget", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-test?name=World"));

  assertEquals(res?.status, 200);
  assertEquals(res?.headers.get("content-type"), "text/html; charset=utf-8");

  const html = await res!.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, ".loom-test { color: red; }");
});

Deno.test("query params appear in data-props attribute", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-test?name=World&count=5"));
  const html = await res!.text();

  assertStringIncludes(html, "data-props=");
  assertStringIncludes(html, "&quot;name&quot;");
  assertStringIncludes(html, "&quot;World&quot;");
});

Deno.test("bundle URL uses default bundlePath", async () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-test"));
  const html = await res!.text();

  assertStringIncludes(html, 'src="/static/loom/loom-test.js"');
});

Deno.test("CSP header is present", () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-test"));
  const csp = res?.headers.get("content-security-policy");

  assertEquals(typeof csp, "string");
  assertStringIncludes(csp!, "default-src 'self'");
});

Deno.test("cache-control header is present", () => {
  const handler = makeHandler();
  const res = handler(req("/embed/loom-test"));

  assertEquals(res?.headers.get("cache-control"), "public, max-age=300");
});

// =============================================================================
// Custom Options
// =============================================================================

Deno.test("custom basePath routes correctly", () => {
  const handler = makeHandler(makeWidgets(["loom-test", testWidget]), {
    basePath: "/widgets/embed",
  });

  assertEquals(handler(req("/embed/loom-test")), null);
  assertEquals(handler(req("/widgets/embed/loom-test"))?.status, 200);
});

Deno.test("custom bundlePath appears in script URL", async () => {
  const handler = makeHandler(makeWidgets(["loom-test", testWidget]), {
    bundlePath: "/assets/widgets",
  });

  const res = handler(req("/embed/loom-test"));
  const html = await res!.text();

  assertStringIncludes(html, 'src="/assets/widgets/loom-test.js"');
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("widget with empty styles renders without extra CSS", async () => {
  const handler = makeHandler(makeWidgets(["loom-bare", noStyleWidget]));
  const res = handler(req("/embed/loom-bare"));
  const html = await res!.text();

  assertStringIncludes(html, "<!DOCTYPE html>");
  // The base reset styles are always present, but no widget-specific styles
  assertEquals(html.includes(".loom-bare"), false);
});

Deno.test("special characters in query params are escaped", async () => {
  const handler = makeHandler();
  const res = handler(req('/embed/loom-test?name=<script>alert(1)</script>'));
  const html = await res!.text();

  // Should be escaped in the data-props attribute
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertStringIncludes(html, "&lt;script&gt;");
});
