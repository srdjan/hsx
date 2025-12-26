/**
 * Unit tests for HSX Page functionality.
 * Focus on validation rules and async component detection.
 *
 * Run with: deno test --allow-read packages/hsx/hsx-page.test.ts
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxPage } from "./hsx-page.ts";
import { jsx } from "./jsx-runtime.ts";
import type { Renderable } from "./jsx-runtime.ts";

// Helper to create a valid page structure
function validPage(bodyContent: Renderable) {
  return jsx("html", {
    children: [
      jsx("head", { children: jsx("title", { children: "Test" }) }),
      jsx("body", { children: bodyContent }),
    ],
  });
}

// =============================================================================
// Async Component Detection Tests
// =============================================================================

Deno.test("rejects async components with clear error", () => {
  const AsyncComponent = async () => {
    await Promise.resolve();
    return jsx("div", { children: "async content" });
  };

  const page = hsxPage(() =>
    validPage(jsx(AsyncComponent, {}))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "Async components are not supported"
  );
});

Deno.test("async component error includes component name", () => {
  async function MyAsyncWidget() {
    await Promise.resolve();
    return jsx("span", {});
  }

  const page = hsxPage(() =>
    validPage(jsx(MyAsyncWidget, {}))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "MyAsyncWidget"
  );
});

Deno.test("accepts synchronous components", () => {
  const SyncComponent = () => jsx("div", { children: "sync content" });

  const page = hsxPage(() =>
    validPage(jsx(SyncComponent, {}))
  );

  // Should not throw
  const result = page.Component({});
  assertEquals(result.type, "html");
});

// =============================================================================
// Root Element Validation Tests
// =============================================================================

Deno.test("requires root html element", () => {
  const page = hsxPage(() => jsx("div", { children: "not html" }));

  assertThrows(
    () => page.Component({}),
    Error,
    "must return a single <html> VNode"
  );
});

Deno.test("requires head and body children", () => {
  const page = hsxPage(() =>
    jsx("html", {
      children: jsx("body", { children: "no head" }),
    })
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "requires both <head> and <body>"
  );
});

Deno.test("requires head before body", () => {
  const page = hsxPage(() =>
    jsx("html", {
      children: [
        jsx("body", { children: "content" }),
        jsx("head", { children: jsx("title", { children: "Test" }) }),
      ],
    })
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "<head> must appear before <body>"
  );
});

// =============================================================================
// Semantic Element Validation Tests
// =============================================================================

Deno.test("rejects class on semantic elements", () => {
  const page = hsxPage(() =>
    validPage(jsx("h1", { class: "styled", children: "Title" }))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "Semantic element <h1> cannot have a class"
  );
});

Deno.test("rejects className on semantic elements", () => {
  const page = hsxPage(() =>
    validPage(jsx("p", { className: "text", children: "Para" }))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "Semantic element <p> cannot have a class"
  );
});

Deno.test("rejects style on semantic elements", () => {
  const page = hsxPage(() =>
    validPage(jsx("section", { style: { color: "red" }, children: "Content" }))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "cannot have inline style"
  );
});

Deno.test("allows class on non-semantic elements", () => {
  const page = hsxPage(() =>
    validPage(jsx("div", { class: "container", children: "Content" }))
  );

  // Should not throw
  const result = page.Component({});
  assertEquals(result.type, "html");
});

Deno.test("allows style on non-semantic elements", () => {
  const page = hsxPage(() =>
    validPage(jsx("span", { style: { color: "blue" }, children: "Text" }))
  );

  // Should not throw
  const result = page.Component({});
  assertEquals(result.type, "html");
});

// =============================================================================
// Style Placement Validation Tests
// =============================================================================

Deno.test("rejects style tags outside head", () => {
  const page = hsxPage(() =>
    validPage(jsx("style", { children: ".foo { color: red; }" }))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "<style> tags must live inside <head>"
  );
});

Deno.test("allows style tags in head", () => {
  const page = hsxPage(() =>
    jsx("html", {
      children: [
        jsx("head", {
          children: [
            jsx("title", { children: "Test" }),
            jsx("style", { children: ".foo { color: red; }" }),
          ],
        }),
        jsx("body", { children: "Content" }),
      ],
    })
  );

  // Should not throw
  const result = page.Component({});
  assertEquals(result.type, "html");
});

// =============================================================================
// Allowed Tags Validation Tests
// =============================================================================

Deno.test("rejects unknown tags", () => {
  const page = hsxPage(() =>
    validPage(jsx("custom-element" as "div", { children: "Content" }))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "Element <custom-element> is not allowed"
  );
});

Deno.test("allows standard semantic tags", () => {
  const semanticTags = ["header", "main", "nav", "section", "article", "footer", "h1", "p", "ul", "li"];

  for (const tag of semanticTags) {
    const page = hsxPage(() =>
      validPage(jsx(tag as "div", { children: "Content" }))
    );

    // Should not throw
    page.Component({});
  }
});

Deno.test("allows non-semantic layout tags", () => {
  const layoutTags = ["div", "span", "button", "form", "input"];

  for (const tag of layoutTags) {
    const page = hsxPage(() =>
      validPage(jsx(tag as "div", { class: "styled" }))
    );

    // Should not throw
    page.Component({});
  }
});

// =============================================================================
// Depth Limit Tests
// =============================================================================

Deno.test("enforces depth limit to prevent infinite recursion", () => {
  // Create a component that recurses deeply
  let depth = 0;
  const DeepComponent = (): Renderable => {
    depth++;
    if (depth > 3000) return jsx("div", { children: "leaf" });
    return jsx("div", { children: jsx(DeepComponent, {}) });
  };

  const page = hsxPage(() =>
    validPage(jsx(DeepComponent, {}))
  );

  assertThrows(
    () => page.Component({}),
    Error,
    "exceeded depth limit"
  );
});

// =============================================================================
// Render Method Tests
// =============================================================================

Deno.test("render() returns Response object", () => {
  const page = hsxPage(() =>
    validPage(jsx("div", { children: "Hello" }))
  );

  const response = page.render();

  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");
});

Deno.test("render() returns 200 status", async () => {
  const page = hsxPage(() =>
    validPage(jsx("div", { children: "Content" }))
  );

  const response = page.render();

  assertEquals(response.status, 200);
});

// =============================================================================
// Component Reference Tests
// =============================================================================

Deno.test("Component property returns the validated component", () => {
  const page = hsxPage(() =>
    validPage(jsx("div", { children: "Test" }))
  );

  assertEquals(typeof page.Component, "function");
});

Deno.test("Component can be called multiple times", () => {
  let callCount = 0;
  const page = hsxPage(() => {
    callCount++;
    return validPage(jsx("div", { children: `Call ${callCount}` }));
  });

  page.Component({});
  page.Component({});
  page.Component({});

  assertEquals(callCount, 3);
});
