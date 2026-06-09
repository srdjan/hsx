/**
 * Unit tests for GenUI widget catalog.
 *
 * Run with: deno test --allow-read --allow-net packages/hsx-widgets/catalog.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { jsx } from "hsx/jsx-runtime";

import { fail, ok } from "./result.ts";
import type { GenUIWidget } from "./genui-widget.ts";
import { createCatalog, type ToolDefinition } from "./catalog.ts";
import {
  RAW_WIDGET_TAG,
  renderRawWidget,
  validateRawWidgetProps,
} from "./raw-widget.ts";
import { sanitizeHtml } from "./sanitize.ts";
import { createDesignGuidelines, formatForAI } from "./design-guidelines.ts";

// =============================================================================
// Test Widget
// =============================================================================

type GreetingProps = { readonly name: string; readonly greeting: string };

const greetingWidget: GenUIWidget<GreetingProps> = {
  tag: "hsx-greeting",
  description: "Displays a personalized greeting message",
  schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Person's name" },
      greeting: { type: "string", description: "Greeting text" },
    },
    required: ["name", "greeting"],
  },
  category: "display",
  examples: [
    { prompt: "Greet Alice", props: { name: "Alice", greeting: "Hello" } },
  ],
  props: {
    validate(raw: unknown) {
      if (typeof raw !== "object" || raw === null) {
        return fail({ tag: "validation_error", message: "Expected object" });
      }
      const obj = raw as Record<string, unknown>;
      if (typeof obj.name !== "string") {
        return fail({
          tag: "validation_error",
          message: "Name required",
          field: "name",
        });
      }
      if (typeof obj.greeting !== "string") {
        return fail({
          tag: "validation_error",
          message: "Greeting required",
          field: "greeting",
        });
      }
      return ok({ name: obj.name, greeting: obj.greeting });
    },
  },
  styles: ".greeting { font-weight: 500; }",
  render(props: GreetingProps) {
    return jsx("div", {
      class: "greeting",
      children: `${props.greeting}, ${props.name}!`,
    });
  },
};

// =============================================================================
// Catalog Tests
// =============================================================================

Deno.test("createCatalog registers widgets by tag", () => {
  const catalog = createCatalog([greetingWidget]);
  assertEquals(catalog.widgets.size, 1);
  assertEquals(catalog.widgets.has("hsx-greeting"), true);
});

Deno.test("createCatalog rejects duplicate tags", () => {
  assertThrows(
    () => createCatalog([greetingWidget, greetingWidget]),
    Error,
    "Duplicate widget tag: hsx-greeting",
  );
});

Deno.test("toTools generates tool definitions from widgets", () => {
  const catalog = createCatalog([greetingWidget]);
  const tools = catalog.toTools();

  // Registered widget + raw widget
  assertEquals(tools.length, 2);

  const greetingTool = tools.find(
    (t: ToolDefinition) => t.name === "hsx-greeting",
  );
  assertEquals(greetingTool !== undefined, true);
  assertStringIncludes(
    greetingTool!.description,
    "personalized greeting",
  );
  assertEquals(
    (greetingTool!.parameters as Record<string, unknown>).type,
    "object",
  );
});

Deno.test("toTools includes examples in description", () => {
  const catalog = createCatalog([greetingWidget]);
  const tools = catalog.toTools();
  const tool = tools.find((t: ToolDefinition) => t.name === "hsx-greeting")!;
  assertStringIncludes(tool.description, "Greet Alice");
});

Deno.test("toTools always includes raw widget", () => {
  const catalog = createCatalog([greetingWidget]);
  const tools = catalog.toTools();
  const rawTool = tools.find(
    (t: ToolDefinition) => t.name === RAW_WIDGET_TAG,
  );
  assertEquals(rawTool !== undefined, true);
});

Deno.test("catalog.render produces HTML for valid props", () => {
  const catalog = createCatalog([greetingWidget]);
  const result = catalog.render("hsx-greeting", {
    name: "Alice",
    greeting: "Hello",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value, "Hello, Alice!");
    assertStringIncludes(result.value, 'data-widget="hsx-greeting"');
    assertStringIncludes(result.value, ".greeting { font-weight: 500; }");
  }
});

Deno.test("catalog.render returns error for unknown widget", () => {
  const catalog = createCatalog([greetingWidget]);
  const result = catalog.render("hsx-nonexistent", {});

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.tag, "unknown_widget");
  }
});

Deno.test("catalog.render returns error for invalid props", () => {
  const catalog = createCatalog([greetingWidget]);
  const result = catalog.render("hsx-greeting", { name: 42 });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.tag, "validation_error");
  }
});

Deno.test("catalog.render handles raw widget", () => {
  const catalog = createCatalog([]);
  const result = catalog.render(RAW_WIDGET_TAG, {
    title: "test_widget",
    html: "<p>Hello from raw</p>",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertStringIncludes(result.value, "<p>Hello from raw</p>");
    assertStringIncludes(result.value, "shadowrootmode");
    assertStringIncludes(result.value, "hsx-raw");
  }
});

Deno.test("catalog.guidelines includes widget descriptions", () => {
  const catalog = createCatalog([greetingWidget], {
    designSystem: "Use indigo accent colors.",
  });
  const guidelines = catalog.guidelines();

  assertStringIncludes(guidelines, "hsx-greeting");
  assertStringIncludes(guidelines, "personalized greeting");
  assertStringIncludes(guidelines, "indigo accent");
});

// =============================================================================
// Raw Widget Tests
// =============================================================================

Deno.test("validateRawWidgetProps accepts valid input", () => {
  const result = validateRawWidgetProps({
    title: "test",
    html: "<p>content</p>",
  });
  assertEquals(result.ok, true);
});

Deno.test("validateRawWidgetProps rejects missing title", () => {
  const result = validateRawWidgetProps({ html: "<p>content</p>" });
  assertEquals(result.ok, false);
});

Deno.test("validateRawWidgetProps rejects missing html", () => {
  const result = validateRawWidgetProps({ title: "test" });
  assertEquals(result.ok, false);
});

Deno.test("sanitizeHtml removes script elements", () => {
  const output = sanitizeHtml(
    '<p>Hello</p><script>alert("xss")</script><p>World</p>',
  );
  assertEquals(output.includes("script"), false);
  assertEquals(output.includes("<p>Hello</p>"), true);
  assertEquals(output.includes("<p>World</p>"), true);
});

Deno.test("sanitizeHtml strips event handler attributes", () => {
  const output = sanitizeHtml('<img onerror="alert(1)" src="pic.jpg">');
  assertEquals(output.includes("onerror"), false);
  assertEquals(output.includes("src"), true);
});

Deno.test("sanitizeHtml strips onclick from div", () => {
  const output = sanitizeHtml('<div onclick="steal()" class="card">text</div>');
  assertEquals(output.includes("onclick"), false);
  assertEquals(output.includes("class"), true);
  assertEquals(output.includes("text"), true);
});

Deno.test("sanitizeHtml escapes preserved attribute values", () => {
  const output = sanitizeHtml(
    '<div title=\'x" onclick="steal()\' data-note="<ok>">text</div>',
  );

  assertEquals(output.includes(' onclick="'), false);
  assertStringIncludes(output, 'title="x&quot; onclick=&quot;steal()"');
  assertStringIncludes(output, 'data-note="&lt;ok&gt;"');
});

Deno.test("sanitizeHtml strips javascript: URIs", () => {
  const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
  assertEquals(output.includes("javascript"), false);
  assertEquals(output.includes("click"), true);
});

Deno.test("sanitizeHtml removes iframe tags", () => {
  const output = sanitizeHtml(
    '<p>safe</p><iframe src="evil.com"></iframe><p>also safe</p>',
  );
  assertEquals(output.includes("iframe"), false);
  assertEquals(output.includes("<p>safe</p>"), true);
});

Deno.test("sanitizeHtml removes object and embed tags", () => {
  const output = sanitizeHtml('<object data="x"></object><embed src="y">');
  assertEquals(output.includes("object"), false);
  assertEquals(output.includes("embed"), false);
});

Deno.test("sanitizeHtml removes meta tags", () => {
  const output = sanitizeHtml(
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  );
  assertEquals(output.includes("meta"), false);
});

Deno.test("sanitizeHtml preserves style tags", () => {
  const output = sanitizeHtml("<style>.card { color: red; }</style>");
  assertEquals(output.includes("<style>"), true);
  assertEquals(output.includes("color: red"), true);
});

Deno.test("sanitizeHtml preserves allowed HTML structure", () => {
  const input =
    '<div class="card"><h2>Title</h2><p>Content</p><ul><li>Item</li></ul></div>';
  const output = sanitizeHtml(input);
  assertEquals(output, input);
});

Deno.test("sanitizeHtml strips data: URI in src", () => {
  const output = sanitizeHtml(
    '<img src="data:text/html,<script>alert(1)</script>">',
  );
  assertEquals(output.includes("data:"), false);
});

Deno.test("renderRawWidget produces shadow DOM HTML", () => {
  const html = renderRawWidget({ title: "test", html: "<p>content</p>" });
  assertStringIncludes(html, '<template shadowrootmode="closed">');
  assertStringIncludes(html, "<p>content</p>");
  assertStringIncludes(html, "hsx-raw");
});

Deno.test("renderRawWidget sanitizes content", () => {
  const html = renderRawWidget({
    title: "test",
    html: '<p>safe</p><script>alert("xss")</script><img onerror="steal()">',
  });
  assertStringIncludes(html, "<p>safe</p>");
  assertEquals(html.includes("alert"), false);
  assertEquals(html.includes("onerror"), false);
});

Deno.test("renderRawWidget escapes title attribute", () => {
  const html = renderRawWidget({
    title: 'test"<>',
    html: "<p>content</p>",
  });
  assertStringIncludes(html, "test&quot;&lt;&gt;");
});

// =============================================================================
// Design Guidelines Tests
// =============================================================================

Deno.test("createDesignGuidelines uses defaults", () => {
  const guidelines = createDesignGuidelines();
  assertStringIncludes(guidelines.colors, "--text");
  assertStringIncludes(guidelines.typography, "system-ui");
  assertStringIncludes(guidelines.constraints, "Streaming-safe");
});

Deno.test("createDesignGuidelines accepts overrides", () => {
  const guidelines = createDesignGuidelines({
    colors: "Custom color system",
  });
  assertEquals(guidelines.colors, "Custom color system");
  // Other fields use defaults
  assertStringIncludes(guidelines.typography, "system-ui");
});

Deno.test("formatForAI produces structured string", () => {
  const guidelines = createDesignGuidelines();
  const formatted = formatForAI(guidelines);
  assertStringIncludes(formatted, "# Design System Guidelines");
  assertStringIncludes(formatted, "## Colors");
  assertStringIncludes(formatted, "## Typography");
  assertStringIncludes(formatted, "## Constraints");
});
