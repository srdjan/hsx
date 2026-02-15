/**
 * Unit tests for HSX rendering pipeline.
 * Focus on security-critical functionality.
 *
 * Run with: deno test --allow-read packages/hsx/render.test.ts
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { renderHtml, Fragment } from "./mod.ts";
import { jsx } from "./jsx-runtime.ts";

// =============================================================================
// HTML Escaping Tests
// =============================================================================

Deno.test("escapes HTML entities in text content", () => {
  const html = renderHtml(jsx("div", { children: "<script>alert('xss')</script>" }));
  assertEquals(html, "<div>&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;</div>");
});

Deno.test("escapes HTML entities in attribute values", () => {
  const html = renderHtml(jsx("div", { title: '"><script>alert("xss")</script>' }));
  assertEquals(html, '<div title="&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"></div>');
});

Deno.test("escapes ampersands correctly", () => {
  const html = renderHtml(jsx("div", { children: "Tom & Jerry" }));
  assertEquals(html, "<div>Tom &amp; Jerry</div>");
});

Deno.test("escapes all special characters", () => {
  const html = renderHtml(jsx("span", { children: `<>&"'` }));
  assertEquals(html, "<span>&lt;&gt;&amp;&quot;&#x27;</span>");
});

// =============================================================================
// CSS Injection Prevention Tests
// =============================================================================

Deno.test("rejects CSS injection via style property names", () => {
  // Malicious property name with injection attempt
  const style = {
    "color;background:url(javascript:alert('xss'))": "red",
  };
  const html = renderHtml(jsx("div", { style }));
  // Should filter out the malicious property entirely
  assertEquals(html, '<div style=""></div>');
});

Deno.test("rejects style property names with semicolons", () => {
  const style = { "color;": "red" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style=""></div>');
});

Deno.test("rejects style property names with colons", () => {
  const style = { "color:red;background": "blue" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style=""></div>');
});

Deno.test("accepts valid camelCase style properties", () => {
  const style = { backgroundColor: "red", fontSize: "16px" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="background-color:red;font-size:16px;"></div>');
});

Deno.test("accepts valid kebab-case style properties", () => {
  const style = { "background-color": "blue" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="background-color:blue;"></div>');
});

Deno.test("filters NaN values from styles", () => {
  const style = { color: "red", width: NaN };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="color:red;"></div>');
});

Deno.test("filters Infinity values from styles", () => {
  const style = { color: "blue", height: Infinity };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="color:blue;"></div>');
});

Deno.test("sanitizes semicolons from style values", () => {
  const style = { color: "red; background: url(evil)" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="color:red background: /* blocked */evil);"></div>');
});

Deno.test("sanitizes curly braces from style values", () => {
  const style = { color: "red} .evil { background: url()" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="color:red .evil  background: /* blocked */);"></div>');
});

// =============================================================================
// JSON Serialization Error Handling Tests
// =============================================================================

Deno.test("throws clear error for circular references in vals", () => {
  const circular: Record<string, unknown> = { a: 1 };
  circular.self = circular;

  assertThrows(
    () => renderHtml(jsx("button", { vals: circular })),
    Error,
    "circular reference detected"
  );
});

Deno.test("includes attribute name in circular reference error", () => {
  const circular: Record<string, unknown> = { x: 1 };
  circular.ref = circular;

  assertThrows(
    () => renderHtml(jsx("div", { headers: circular })),
    Error,
    '"hx-headers"'
  );
});

// =============================================================================
// Manual hx-* Attribute Rejection Tests
// =============================================================================

Deno.test("rejects manual hx-get attribute", () => {
  assertThrows(
    () => renderHtml(jsx("button", { "hx-get": "/api" })),
    Error,
    "Manual hx-* props are disallowed"
  );
});

Deno.test("rejects manual hx-post attribute", () => {
  assertThrows(
    () => renderHtml(jsx("form", { "hx-post": "/submit" })),
    Error,
    "Manual hx-* props are disallowed"
  );
});

Deno.test("rejects manual hx-target attribute", () => {
  assertThrows(
    () => renderHtml(jsx("button", { "hx-target": "#list" })),
    Error,
    "Manual hx-* props are disallowed"
  );
});

// =============================================================================
// DoS Protection Tests
// =============================================================================

Deno.test("enforces maxDepth limit", () => {
  // Create deeply nested structure
  let node = jsx("div", { children: "leaf" });
  for (let i = 0; i < 15; i++) {
    node = jsx("div", { children: node });
  }

  assertThrows(
    () => renderHtml(node, { maxDepth: 10 }),
    Error,
    "Maximum render depth exceeded"
  );
});

Deno.test("enforces maxNodes limit", () => {
  const children = Array.from({ length: 20 }, (_, i) =>
    jsx("span", { children: String(i) })
  );

  assertThrows(
    () => renderHtml(jsx("div", { children }), { maxNodes: 10 }),
    Error,
    "Maximum node count exceeded"
  );
});

// =============================================================================
// Void Elements Tests
// =============================================================================

Deno.test("renders void elements without closing tags", () => {
  const html = renderHtml(jsx("input", { type: "text", name: "test" }));
  assertEquals(html, '<input type="text" name="test">');
});

Deno.test("renders br as void element", () => {
  const html = renderHtml(jsx("br", {}));
  assertEquals(html, "<br>");
});

Deno.test("renders img as void element with attributes", () => {
  const html = renderHtml(jsx("img", { src: "/image.png", alt: "Test" }));
  assertEquals(html, '<img src="/image.png" alt="Test">');
});

// =============================================================================
// Raw Text Elements Tests
// =============================================================================

Deno.test("does not escape script content", () => {
  const html = renderHtml(jsx("script", { children: "const x = 1 < 2;" }));
  assertEquals(html, "<script>const x = 1 < 2;</script>");
});

Deno.test("does not escape style content", () => {
  const html = renderHtml(jsx("style", { children: ".foo > .bar { color: red; }" }));
  assertEquals(html, "<style>.foo > .bar { color: red; }</style>");
});

// =============================================================================
// Fragment Tests
// =============================================================================

Deno.test("Fragment renders children without wrapper", () => {
  const html = renderHtml(
    jsx(Fragment, {
      children: [
        jsx("span", { children: "A" }),
        jsx("span", { children: "B" }),
      ],
    })
  );
  assertEquals(html, "<span>A</span><span>B</span>");
});

// =============================================================================
// Boolean Attribute Tests
// =============================================================================

Deno.test("renders true boolean attributes without value", () => {
  const html = renderHtml(jsx("input", { disabled: true, type: "text" }));
  assertEquals(html, '<input disabled type="text">');
});

Deno.test("omits false boolean attributes", () => {
  const html = renderHtml(jsx("input", { disabled: false, type: "text" }));
  assertEquals(html, '<input type="text">');
});

// =============================================================================
// className to class Conversion Tests
// =============================================================================

Deno.test("converts className to class attribute", () => {
  const html = renderHtml(jsx("div", { className: "foo bar" }));
  assertEquals(html, '<div class="foo bar"></div>');
});

// =============================================================================
// Primitive Rendering Tests
// =============================================================================

Deno.test("renders null as empty string", () => {
  const html = renderHtml(null);
  assertEquals(html, "");
});

Deno.test("renders undefined as empty string", () => {
  const html = renderHtml(undefined);
  assertEquals(html, "");
});

Deno.test("renders boolean false as empty string", () => {
  const html = renderHtml(false);
  assertEquals(html, "");
});

Deno.test("renders boolean true as empty string", () => {
  const html = renderHtml(true);
  assertEquals(html, "");
});

Deno.test("renders numbers correctly", () => {
  const html = renderHtml(jsx("span", { children: 42 }));
  assertEquals(html, "<span>42</span>");
});

Deno.test("renders string 0 correctly", () => {
  const html = renderHtml(jsx("span", { children: 0 }));
  assertEquals(html, "<span>0</span>");
});

// =============================================================================
// CSS Custom Properties Tests (Phase 1A)
// =============================================================================

Deno.test("accepts CSS custom properties (--variable-name)", () => {
  const style = { "--custom-color": "red", "--spacing-lg": "24px" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="--custom-color:red;--spacing-lg:24px;"></div>');
});

Deno.test("rejects malicious CSS custom property names", () => {
  const style = { "--foo;background:url(evil)": "red" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style=""></div>');
});

// =============================================================================
// CSS Value Sanitization Tests (Phase 1B)
// =============================================================================

Deno.test("blocks url() in style values", () => {
  const style = { background: "url(javascript:alert('xss'))" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, `<div style="background:/* blocked */javascript:alert(&#x27;xss&#x27;));"></div>`);
});

Deno.test("preserves calc() in style values", () => {
  const style = { width: "calc(100% - 20px)" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="width:calc(100% - 20px);"></div>');
});

Deno.test("blocks expression() in style values", () => {
  const style = { width: "expression(document.body.clientWidth)" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="width:/* blocked */document.body.clientWidth);"></div>');
});

Deno.test("blocks @import in style values", () => {
  const style = { content: "@import 'evil.css'" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, `<div style="content:/* blocked */ &#x27;evil.css&#x27;;"></div>`);
});

// =============================================================================
// Multi-Verb Form Validation Tests (Phase 1F)
// =============================================================================

Deno.test("rejects form with multiple HTTP verbs", () => {
  assertThrows(
    () => renderHtml(jsx("form", { post: "/submit", get: "/data" })),
    Error,
    "cannot have multiple HTTP verb attributes"
  );
});

Deno.test("allows form with single HTTP verb", () => {
  const html = renderHtml(jsx("form", { post: "/submit" }));
  assertEquals(html.includes('hx-post="/submit"'), true);
});

// =============================================================================
// HTMX Script Auto-Injection Tests (Phase 2C)
// =============================================================================

Deno.test("auto-injects HTMX script when HSX attributes are used", () => {
  const html = renderHtml(
    jsx("html", {
      children: jsx("body", {
        children: jsx("button", { get: "/api/data", children: "Load" }),
      }),
    })
  );
  assertEquals(html.includes('<script src="/static/htmx.js"></script></body>'), true);
});

Deno.test("does not inject HTMX script for plain HTML", () => {
  const html = renderHtml(
    jsx("html", {
      children: jsx("body", {
        children: jsx("div", { children: "Hello" }),
      }),
    })
  );
  assertEquals(html.includes("htmx.js"), false);
});

Deno.test("forces HTMX injection with injectHtmx: true", () => {
  const html = renderHtml(
    jsx("html", {
      children: jsx("body", {
        children: jsx("div", { children: "No HSX attrs" }),
      }),
    }),
    { injectHtmx: true }
  );
  assertEquals(html.includes('<script src="/static/htmx.js"></script></body>'), true);
});

Deno.test("suppresses HTMX injection with injectHtmx: false", () => {
  const html = renderHtml(
    jsx("html", {
      children: jsx("body", {
        children: jsx("button", { get: "/api", children: "Load" }),
      }),
    }),
    { injectHtmx: false }
  );
  assertEquals(html.includes("htmx.js"), false);
});

// =============================================================================
// SSE Attribute Normalization Tests (Phase 2D)
// =============================================================================

Deno.test("normalizes ext attribute to hx-ext", () => {
  const html = renderHtml(jsx("div", { ext: "sse" }));
  assertEquals(html, '<div hx-ext="sse"></div>');
});

Deno.test("normalizes sseConnect attribute to sse-connect", () => {
  const html = renderHtml(jsx("div", { sseConnect: "/events" }));
  assertEquals(html, '<div sse-connect="/events"></div>');
});

Deno.test("normalizes sseSwap attribute to sse-swap", () => {
  const html = renderHtml(jsx("div", { sseSwap: "message" }));
  assertEquals(html, '<div sse-swap="message"></div>');
});

// =============================================================================
// Form Fallback Action/Method Tests (Phase 2E)
// =============================================================================

Deno.test("form with post gets action and method auto-populated", () => {
  const html = renderHtml(jsx("form", { post: "/submit" }));
  assertEquals(html.includes('action="/submit"'), true);
  assertEquals(html.includes('method="post"'), true);
  assertEquals(html.includes('hx-post="/submit"'), true);
});

Deno.test("form with get gets action and method auto-populated", () => {
  const html = renderHtml(jsx("form", { get: "/search" }));
  assertEquals(html.includes('action="/search"'), true);
  assertEquals(html.includes('method="get"'), true);
  assertEquals(html.includes('hx-get="/search"'), true);
});

Deno.test("explicit action is not overridden by HSX verb", () => {
  const html = renderHtml(jsx("form", { post: "/submit", action: "/custom" }));
  assertEquals(html.includes('action="/custom"'), true);
  assertEquals(html.includes('hx-post="/submit"'), true);
});

Deno.test("explicit method is not overridden by HSX verb", () => {
  const html = renderHtml(jsx("form", { post: "/submit", method: "dialog" }));
  assertEquals(html.includes('method="dialog"'), true);
  assertEquals(html.includes('hx-post="/submit"'), true);
});

// =============================================================================
// Multi-Attribute HSX Tests
// =============================================================================

Deno.test("get + target + swap render together", () => {
  const html = renderHtml(jsx("button", { get: "/data", target: "#list", swap: "innerHTML" }));
  assertEquals(html.includes('hx-get="/data"'), true);
  assertEquals(html.includes('hx-target="#list"'), true);
  assertEquals(html.includes('hx-swap="innerHTML"'), true);
});

Deno.test("post + vals + headers render together", () => {
  const html = renderHtml(jsx("form", {
    post: "/submit",
    vals: JSON.stringify({ extra: "data" }),
    headers: JSON.stringify({ "X-Custom": "value" }),
  }));
  assertEquals(html.includes('hx-post="/submit"'), true);
  assertEquals(html.includes('hx-vals='), true);
  assertEquals(html.includes('hx-headers='), true);
});

Deno.test("get + trigger + swap on div", () => {
  const html = renderHtml(jsx("div", { get: "/poll", trigger: "every 2s", swap: "outerHTML" }));
  assertEquals(html.includes('hx-get="/poll"'), true);
  assertEquals(html.includes('hx-trigger="every 2s"'), true);
  assertEquals(html.includes('hx-swap="outerHTML"'), true);
});
