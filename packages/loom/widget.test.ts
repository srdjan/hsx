/**
 * Unit tests for Loom Widget protocol and SSR adapter.
 *
 * Run with: deno test --allow-read --allow-net packages/loom/widget.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { renderHtml } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";

import { ok, fail, match } from "./result.ts";
import type { Widget } from "./widget.ts";
import { widgetToHsxComponent } from "./ssr-adapter.ts";

// =============================================================================
// Test Widget
// =============================================================================

type TestProps = { readonly name: string; readonly count: number };

const testWidget: Widget<TestProps> = {
  tag: "loom-test",
  props: {
    validate(raw: unknown) {
      if (typeof raw !== "object" || raw === null) {
        return fail({ tag: "validation_error", message: "Expected an object" });
      }
      const obj = raw as Record<string, unknown>;
      if (typeof obj.name !== "string" || obj.name.length === 0) {
        return fail({ tag: "validation_error", message: "Name required", field: "name" });
      }
      const count = typeof obj.count === "string" ? parseInt(obj.count, 10) : obj.count;
      if (typeof count !== "number" || isNaN(count)) {
        return fail({ tag: "validation_error", message: "Count must be a number", field: "count" });
      }
      return ok({ name: obj.name as string, count });
    },
  },
  styles: ".loom-test { color: red; }",
  render(props) {
    return jsx("div", {
      class: "loom-test",
      children: `${props.name}: ${props.count}`,
    });
  },
};

// =============================================================================
// Result Type Tests
// =============================================================================

Deno.test("ok() creates a successful Result", () => {
  const result = ok(42);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 42);
  }
});

Deno.test("fail() creates a failed Result", () => {
  const result = fail("error");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "error");
  }
});

Deno.test("match() handles ok case", () => {
  const result = ok(10);
  const output = match(result, {
    ok: (v) => v * 2,
    fail: () => -1,
  });
  assertEquals(output, 20);
});

Deno.test("match() handles fail case", () => {
  const result = fail("boom");
  const output = match(result, {
    ok: () => "never",
    fail: (e) => `error: ${e}`,
  });
  assertEquals(output, "error: boom");
});

// =============================================================================
// Widget Render Tests
// =============================================================================

Deno.test("widget render produces valid VNode serializable by renderHtml", () => {
  const vnode = testWidget.render({ name: "Alice", count: 5 });
  const html = renderHtml(vnode);
  assertEquals(html, '<div class="loom-test">Alice: 5</div>');
});

Deno.test("widget render escapes HTML in props", () => {
  const vnode = testWidget.render({ name: "<script>alert(1)</script>", count: 0 });
  const html = renderHtml(vnode);
  assertStringIncludes(html, "&lt;script&gt;");
});

// =============================================================================
// Props Validation Tests
// =============================================================================

Deno.test("props validation returns ok for valid input", () => {
  const result = testWidget.props.validate({ name: "Bob", count: "3" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.name, "Bob");
    assertEquals(result.value.count, 3);
  }
});

Deno.test("props validation returns error for missing name", () => {
  const result = testWidget.props.validate({ count: "1" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.tag, "validation_error");
    if (result.error.tag === "validation_error") {
      assertEquals(result.error.field, "name");
    }
  }
});

Deno.test("props validation returns error for non-object input", () => {
  const result = testWidget.props.validate("not an object");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.tag, "validation_error");
  }
});

Deno.test("props validation returns error for invalid count", () => {
  const result = testWidget.props.validate({ name: "Bob", count: "notanumber" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.tag, "validation_error");
    if (result.error.tag === "validation_error") {
      assertEquals(result.error.field, "count");
    }
  }
});

// =============================================================================
// SSR Adapter Tests
// =============================================================================

Deno.test("widgetToHsxComponent returns HsxComponent with handle() and match()", () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test/:name",
  });

  assertEquals(typeof component.handle, "function");
  assertEquals(typeof component.match, "function");
  assertEquals(typeof component.build, "function");
  assertEquals(component.path, "/widgets/test/:name");
  assertEquals(component.methods, ["GET"]);
});

Deno.test("SSR adapter wraps output in data-widget div with style", async () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test",
  });

  const req = new Request("http://localhost/widgets/test?name=Alice&count=5");
  const res = await component.handle(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, 'data-widget="loom-test"');
  assertStringIncludes(html, "<style>.loom-test { color: red; }</style>");
  assertStringIncludes(html, "Alice: 5");
});

Deno.test("SSR adapter uses widget.load when present", async () => {
  const widgetWithLoader: Widget<TestProps> = {
    ...testWidget,
    load: async (params) => {
      if (!params.name) {
        return fail({ tag: "load_error", message: "Missing name" });
      }
      return ok({ name: params.name, count: 42 });
    },
  };

  const component = widgetToHsxComponent(widgetWithLoader, {
    path: "/widgets/test/:name",
  });

  const req = new Request("http://localhost/widgets/test/Carol");
  const res = await component.handle(req);

  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, "Carol: 42");
});

Deno.test("SSR adapter returns 500 for load errors", async () => {
  const widgetWithFailingLoader: Widget<TestProps> = {
    ...testWidget,
    load: async (_params) => {
      return fail({ tag: "load_error", message: "Database unreachable" });
    },
  };

  const component = widgetToHsxComponent(widgetWithFailingLoader, {
    path: "/widgets/test",
  });

  const req = new Request("http://localhost/widgets/test");
  const res = await component.handle(req);

  assertEquals(res.status, 500);
});

Deno.test("SSR adapter returns 500 for validation errors (via query params)", async () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test",
  });

  // Missing required 'name' param
  const req = new Request("http://localhost/widgets/test?count=5");
  const res = await component.handle(req);

  assertEquals(res.status, 500);
});

Deno.test("SSR adapter match returns null for non-matching paths", () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test/:name",
  });

  assertEquals(component.match("/other/path"), null);
});

Deno.test("SSR adapter match extracts params from matching paths", () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test/:name",
  });

  const params = component.match("/widgets/test/Dave");
  assertEquals(params, { name: "Dave" });
});

Deno.test("SSR adapter respects custom methods", () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test",
    methods: ["GET", "POST"],
  });

  assertEquals(component.methods, ["GET", "POST"]);
});

Deno.test("SSR adapter returns 405 for disallowed methods", async () => {
  const component = widgetToHsxComponent(testWidget, {
    path: "/widgets/test",
    methods: ["GET"],
  });

  const req = new Request("http://localhost/widgets/test?name=X&count=1", {
    method: "POST",
  });
  const res = await component.handle(req);

  assertEquals(res.status, 405);
});

// =============================================================================
// Widget with no styles
// =============================================================================

Deno.test("SSR adapter omits style tag when widget has empty styles", async () => {
  const noStyleWidget: Widget<TestProps> = {
    ...testWidget,
    styles: "",
  };

  const component = widgetToHsxComponent(noStyleWidget, {
    path: "/widgets/test",
  });

  const req = new Request("http://localhost/widgets/test?name=Eve&count=1");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, 'data-widget="loom-test"');
  assertEquals(html.includes("<style>"), false);
});
