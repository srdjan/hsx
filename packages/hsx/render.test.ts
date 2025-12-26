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
  assertEquals(html, '<div style="color:red background url(evil);"></div>');
});

Deno.test("sanitizes curly braces from style values", () => {
  const style = { color: "red} .evil { background: url()" };
  const html = renderHtml(jsx("div", { style }));
  assertEquals(html, '<div style="color:red .evil  background url();"></div>');
});

// =============================================================================
// JSON Serialization Error Handling Tests
// =============================================================================

Deno.test("throws clear error for circular references in hx-vals", () => {
  const circular: Record<string, unknown> = { a: 1 };
  circular.self = circular;

  assertThrows(
    () => renderHtml(jsx("button", { "hx-vals": circular })),
    Error,
    "circular reference detected"
  );
});

Deno.test("includes attribute name in circular reference error", () => {
  const circular: Record<string, unknown> = { x: 1 };
  circular.ref = circular;

  assertThrows(
    () => renderHtml(jsx("div", { "hx-headers": circular })),
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
