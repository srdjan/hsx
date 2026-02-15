/**
 * Unit tests for Loom style collection and hoistStyles behavior.
 *
 * Run with: deno test --allow-read --allow-net packages/loom/styles.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { renderHtml } from "@srdjan/hsx/core";
import { hsxPage } from "@srdjan/hsx";
import { jsx } from "hsx/jsx-runtime";

import { ok, fail } from "./result.ts";
import type { Widget } from "./widget.ts";
import { collectWidgetStyles, WidgetStyles } from "./styles.ts";
import { widgetToHsxComponent } from "./ssr-adapter.ts";

// =============================================================================
// Test Widgets
// =============================================================================

type GreetingProps = { readonly name: string };
type CounterProps = { readonly count: number };

const greetingWidget: Widget<GreetingProps> = {
  tag: "loom-greeting",
  props: {
    validate(raw: unknown) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.name !== "string") {
        return fail({ tag: "validation_error", message: "Name required" });
      }
      return ok({ name: obj.name });
    },
  },
  styles: ".greeting { color: blue; }",
  render: (props) => jsx("div", { class: "greeting", children: `Hello, ${props.name}!` }),
};

const counterWidget: Widget<CounterProps> = {
  tag: "loom-counter",
  props: {
    validate(raw: unknown) {
      const obj = raw as Record<string, unknown>;
      const count = typeof obj.count === "string" ? parseInt(obj.count, 10) : obj.count;
      if (typeof count !== "number" || isNaN(count)) {
        return fail({ tag: "validation_error", message: "Count required" });
      }
      return ok({ count });
    },
  },
  styles: ".counter { font-weight: bold; }",
  render: (props) => jsx("span", { class: "counter", children: String(props.count) }),
};

const noStyleWidget: Widget<GreetingProps> = {
  ...greetingWidget,
  tag: "loom-nostyle",
  styles: "",
};

// =============================================================================
// collectWidgetStyles Tests
// =============================================================================

Deno.test("collectWidgetStyles returns combined CSS from multiple widgets", () => {
  const css = collectWidgetStyles([greetingWidget, counterWidget]);
  assertStringIncludes(css, ".greeting { color: blue; }");
  assertStringIncludes(css, ".counter { font-weight: bold; }");
});

Deno.test("collectWidgetStyles deduplicates by widget tag", () => {
  const css = collectWidgetStyles([greetingWidget, greetingWidget, counterWidget]);
  // greeting CSS should appear exactly once
  const matches = css.match(/\.greeting/g);
  assertEquals(matches?.length, 1);
});

Deno.test("collectWidgetStyles returns empty string for widgets with no styles", () => {
  const css = collectWidgetStyles([noStyleWidget]);
  assertEquals(css, "");
});

Deno.test("collectWidgetStyles returns empty string for empty array", () => {
  const css = collectWidgetStyles([]);
  assertEquals(css, "");
});

Deno.test("collectWidgetStyles skips styleless widgets in mixed array", () => {
  const css = collectWidgetStyles([noStyleWidget, counterWidget]);
  assertEquals(css, ".counter { font-weight: bold; }");
});

Deno.test("collectWidgetStyles preserves order of first occurrence", () => {
  const css = collectWidgetStyles([counterWidget, greetingWidget]);
  const counterIdx = css.indexOf(".counter");
  const greetingIdx = css.indexOf(".greeting");
  assertEquals(counterIdx < greetingIdx, true);
});

// =============================================================================
// WidgetStyles Component Tests
// =============================================================================

Deno.test("WidgetStyles renders a style tag with collected CSS", () => {
  const vnode = WidgetStyles({ widgets: [greetingWidget, counterWidget] });
  const html = renderHtml(vnode);
  assertStringIncludes(html, "<style>");
  assertStringIncludes(html, ".greeting { color: blue; }");
  assertStringIncludes(html, ".counter { font-weight: bold; }");
  assertStringIncludes(html, "</style>");
});

Deno.test("WidgetStyles renders nothing when all widgets have empty styles", () => {
  const result = WidgetStyles({ widgets: [noStyleWidget] });
  assertEquals(result, null);
});

Deno.test("WidgetStyles renders nothing for empty widgets array", () => {
  const result = WidgetStyles({ widgets: [] });
  assertEquals(result, null);
});

// =============================================================================
// hoistStyles Option Tests
// =============================================================================

Deno.test("SSR adapter with hoistStyles: true omits inline style tag", async () => {
  const component = widgetToHsxComponent(greetingWidget, {
    path: "/widgets/greeting",
    hoistStyles: true,
  });

  const req = new Request("http://localhost/widgets/greeting?name=Alice");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, 'data-widget="loom-greeting"');
  assertStringIncludes(html, "Hello, Alice!");
  assertEquals(html.includes("<style>"), false);
});

Deno.test("SSR adapter with hoistStyles: false (default) keeps inline style tag", async () => {
  const component = widgetToHsxComponent(greetingWidget, {
    path: "/widgets/greeting",
  });

  const req = new Request("http://localhost/widgets/greeting?name=Bob");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, "<style>.greeting { color: blue; }</style>");
});

Deno.test("SSR adapter with hoistStyles: true still renders content correctly", async () => {
  const component = widgetToHsxComponent(counterWidget, {
    path: "/widgets/counter",
    hoistStyles: true,
  });

  const req = new Request("http://localhost/widgets/counter?count=42");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, 'data-widget="loom-counter"');
  assertStringIncludes(html, "42");
  assertEquals(html.includes("<style>"), false);
});

// =============================================================================
// hsxPage Integration Test
// =============================================================================

Deno.test("Widget inside hsxPage with hoisted styles passes validation", () => {
  // This test verifies the complete pattern: WidgetStyles in <head>,
  // widget content in <body>, and hsxPage validation succeeds.
  const page = hsxPage(() =>
    jsx("html", {
      children: [
        jsx("head", {
          children: [
            jsx("title", { children: "Test Page" }),
            WidgetStyles({ widgets: [greetingWidget] }),
          ],
        }),
        jsx("body", {
          children: jsx("div", {
            "data-widget": greetingWidget.tag,
            children: greetingWidget.render({ name: "World" }),
          }),
        }),
      ],
    })
  );

  // Should not throw - style is in <head>, body has no <style> tags
  const response = page.render();
  assertEquals(response.status, 200);
});

Deno.test("hsxPage with WidgetStyles and multiple widgets passes validation", () => {
  const page = hsxPage(() =>
    jsx("html", {
      children: [
        jsx("head", {
          children: [
            jsx("title", { children: "Multi Widget Page" }),
            WidgetStyles({ widgets: [greetingWidget, counterWidget] }),
          ],
        }),
        jsx("body", {
          children: [
            jsx("div", {
              "data-widget": greetingWidget.tag,
              children: greetingWidget.render({ name: "World" }),
            }),
            jsx("div", {
              "data-widget": counterWidget.tag,
              children: counterWidget.render({ count: 10 }),
            }),
          ],
        }),
      ],
    })
  );

  const response = page.render();
  assertEquals(response.status, 200);
});

Deno.test("hsxPage with no-style widgets renders without style tag", () => {
  const page = hsxPage(() =>
    jsx("html", {
      children: [
        jsx("head", {
          children: jsx("title", { children: "No Style Page" }),
        }),
        jsx("body", {
          children: jsx("div", {
            "data-widget": noStyleWidget.tag,
            children: noStyleWidget.render({ name: "Plain" }),
          }),
        }),
      ],
    })
  );

  const response = page.render();
  assertEquals(response.status, 200);
});
