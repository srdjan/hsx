/**
 * Unit tests for the client event bus: attribute normalization, script
 * injection, and the typed event() registry helper.
 *
 * The bus runtime itself (runtime/hsx-bus.js) runs in the browser and is
 * exercised by examples/event-bus; these tests cover the server-side surface.
 *
 * Run with: deno test --allow-read packages/hsx/hsx-bus.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { event, renderHtml } from "./mod.ts";
import { jsx, type Renderable } from "./jsx-runtime.ts";

function bodyPage(child: Renderable): Renderable {
  return jsx("html", { children: jsx("body", { children: child }) });
}

// =============================================================================
// Attribute normalization
// =============================================================================

Deno.test("emit normalizes to data-hsx-emit and drops the source key", () => {
  const html = renderHtml(jsx("button", { emit: "toast", children: "Go" }));
  assertStringIncludes(html, 'data-hsx-emit="toast"');
  assertEquals(html.includes(" emit="), false);
});

Deno.test("on + act normalize to data-hsx-on / data-hsx-act", () => {
  const html = renderHtml(
    jsx("li", { on: "filter-changed", act: "toggle-class active" }),
  );
  assertStringIncludes(html, 'data-hsx-on="filter-changed"');
  assertStringIncludes(html, 'data-hsx-act="toggle-class active"');
});

Deno.test("emitDetail object serializes to escaped data-hsx-detail JSON", () => {
  const html = renderHtml(
    jsx("button", { emit: "toast", emitDetail: { message: "Saved!" } }),
  );
  // JSON is HTML-escaped: quotes become &quot;
  assertStringIncludes(html, "data-hsx-detail=");
  assertStringIncludes(html, "message");
  assertStringIncludes(html, "Saved!");
  assertEquals(html.includes(" emitDetail="), false);
});

Deno.test("busTrigger normalizes to data-hsx-trigger", () => {
  const html = renderHtml(jsx("div", { emit: "ping", busTrigger: "change" }));
  assertStringIncludes(html, 'data-hsx-trigger="change"');
});

Deno.test("bus attributes never produce hx-* attributes", () => {
  const html = renderHtml(
    jsx("button", { emit: "toast", on: "x", act: "show" }),
  );
  assertEquals(html.includes("hx-"), false);
});

// =============================================================================
// Script injection
// =============================================================================

Deno.test("auto-injects the bus script when a bus attribute is used", () => {
  const html = renderHtml(bodyPage(jsx("button", { emit: "toast" })));
  assertStringIncludes(
    html,
    '<script src="/static/hsx-bus.js"></script></body>',
  );
});

Deno.test("bus-only usage does not inject the HTMX script", () => {
  const html = renderHtml(bodyPage(jsx("button", { emit: "toast" })));
  assertEquals(html.includes("htmx.js"), false);
  assertStringIncludes(html, "hsx-bus.js");
});

Deno.test("does not inject the bus script for plain HTML", () => {
  const html = renderHtml(bodyPage(jsx("div", { children: "Hello" })));
  assertEquals(html.includes("hsx-bus.js"), false);
});

Deno.test("forces bus injection with injectBus: true", () => {
  const html = renderHtml(bodyPage(jsx("div", { children: "none" })), {
    injectBus: true,
  });
  assertStringIncludes(
    html,
    '<script src="/static/hsx-bus.js"></script></body>',
  );
});

Deno.test("suppresses bus injection with injectBus: false", () => {
  const html = renderHtml(bodyPage(jsx("button", { emit: "toast" })), {
    injectBus: false,
  });
  assertEquals(html.includes("hsx-bus.js"), false);
});

Deno.test("a bridge element pulls in BOTH the htmx and bus scripts", () => {
  const html = renderHtml(
    bodyPage(
      jsx("div", { emit: "filter-changed", get: "/stats", trigger: "x" }),
    ),
  );
  assertStringIncludes(html, "htmx.js");
  assertStringIncludes(html, "hsx-bus.js");
});

// =============================================================================
// Interaction with the no-manual-hx-* rule
// =============================================================================

Deno.test("manual hx-* still throws even when bus attributes are present", () => {
  assertThrows(
    () => renderHtml(jsx("div", { "hx-get": "/x", emit: "e" })),
    Error,
    "Manual hx-* props are disallowed",
  );
});

// =============================================================================
// event() registry helper
// =============================================================================

Deno.test("event() returns the bare name string at runtime", () => {
  const e = event<{ message: string }>("toast");
  assertEquals(String(e), "toast");
  // The branded value is usable directly as the emit/on attribute value.
  const html = renderHtml(jsx("button", { emit: e }));
  assertStringIncludes(html, 'data-hsx-emit="toast"');
});
