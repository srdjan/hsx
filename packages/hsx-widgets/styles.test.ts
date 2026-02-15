/**
 * Unit tests for HSX Widgets style collection and hoistStyles behavior.
 *
 * Run with: deno test --allow-read --allow-net packages/hsx-widgets/styles.test.ts
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
  tag: "hsx-greeting",
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
  tag: "hsx-counter",
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
  tag: "hsx-nostyle",
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

  assertStringIncludes(html, 'data-widget="hsx-greeting"');
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

  assertStringIncludes(html, 'data-widget="hsx-counter"');
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

// =============================================================================
// Declarative Shadow DOM Tests
// =============================================================================

const shadowOpenWidget: Widget<GreetingProps> = {
  ...greetingWidget,
  tag: "hsx-shadow-open",
  shadow: "open",
};

const shadowClosedWidget: Widget<GreetingProps> = {
  ...greetingWidget,
  tag: "hsx-shadow-closed",
  shadow: "closed",
};

const shadowNoStyleWidget: Widget<GreetingProps> = {
  ...greetingWidget,
  tag: "hsx-shadow-nostyle",
  styles: "",
  shadow: "open",
};

Deno.test("SSR adapter renders declarative shadow DOM for shadow: open", async () => {
  const component = widgetToHsxComponent(shadowOpenWidget, {
    path: "/widgets/shadow-open",
  });

  const req = new Request("http://localhost/widgets/shadow-open?name=Alice");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<template shadowrootmode="open">');
  assertStringIncludes(html, "<style>.greeting { color: blue; }</style>");
  assertStringIncludes(html, "Hello, Alice!");
});

Deno.test("SSR adapter renders declarative shadow DOM for shadow: closed", async () => {
  const component = widgetToHsxComponent(shadowClosedWidget, {
    path: "/widgets/shadow-closed",
  });

  const req = new Request("http://localhost/widgets/shadow-closed?name=Bob");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<template shadowrootmode="closed">');
  assertStringIncludes(html, "Hello, Bob!");
});

Deno.test("SSR adapter uses widget tag as wrapper element with shadow DOM", async () => {
  const component = widgetToHsxComponent(shadowOpenWidget, {
    path: "/widgets/shadow-tag",
  });

  const req = new Request("http://localhost/widgets/shadow-tag?name=Test");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<hsx-shadow-open data-widget="hsx-shadow-open">');
  assertStringIncludes(html, "</hsx-shadow-open>");
  // Should NOT use <div> wrapper
  assertEquals(html.includes("<div data-widget="), false);
});

Deno.test("Shadow DOM wrapper includes styles inside template even with hoistStyles: true", async () => {
  const component = widgetToHsxComponent(shadowOpenWidget, {
    path: "/widgets/shadow-hoist",
    hoistStyles: true,
  });

  const req = new Request("http://localhost/widgets/shadow-hoist?name=Hoist");
  const res = await component.handle(req);
  const html = await res.text();

  // Styles must be inside the shadow root regardless of hoistStyles
  assertStringIncludes(html, '<template shadowrootmode="open">');
  assertStringIncludes(html, "<style>.greeting { color: blue; }</style>");
});

Deno.test("Shadow DOM wrapper omits styles when widget has empty styles", async () => {
  const component = widgetToHsxComponent(shadowNoStyleWidget, {
    path: "/widgets/shadow-nostyle",
  });

  const req = new Request("http://localhost/widgets/shadow-nostyle?name=Plain");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<template shadowrootmode="open">');
  assertEquals(html.includes("<style>"), false);
  assertStringIncludes(html, "Hello, Plain!");
});

Deno.test("Default behavior (no shadow field) unchanged - uses div wrapper", async () => {
  const component = widgetToHsxComponent(greetingWidget, {
    path: "/widgets/no-shadow",
  });

  const req = new Request("http://localhost/widgets/no-shadow?name=Default");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<div data-widget="hsx-greeting">');
  assertEquals(html.includes("<template"), false);
  assertEquals(html.includes("shadowrootmode"), false);
});

Deno.test("Explicit shadow: none behaves identically to omitting shadow field", async () => {
  const shadowNoneWidget: Widget<GreetingProps> = {
    ...greetingWidget,
    tag: "hsx-shadow-none",
    shadow: "none",
  };

  const component = widgetToHsxComponent(shadowNoneWidget, {
    path: "/widgets/shadow-none",
  });

  const req = new Request("http://localhost/widgets/shadow-none?name=Explicit");
  const res = await component.handle(req);
  const html = await res.text();

  assertStringIncludes(html, '<div data-widget="hsx-shadow-none">');
  assertStringIncludes(html, "<style>.greeting { color: blue; }</style>");
  assertStringIncludes(html, "Hello, Explicit!");
  assertEquals(html.includes("<template"), false);
  assertEquals(html.includes("shadowrootmode"), false);
});
