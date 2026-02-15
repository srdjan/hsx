/**
 * Unit tests for Loom embed entry point generator.
 *
 * Run with: deno test --allow-all packages/loom/build/gen-entry.test.ts
 */

import {
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateEmbedEntry } from "./gen-entry.ts";

// =============================================================================
// Output Structure
// =============================================================================

Deno.test("output imports the widget from the specified path", () => {
  const src = generateEmbedEntry({
    widgetImportPath: "./widgets/greeting.tsx",
    widgetExportName: "greetingWidget",
  });
  assertStringIncludes(src, 'from "./widgets/greeting.tsx"');
});

Deno.test("output imports the named export as 'widget'", () => {
  const src = generateEmbedEntry({
    widgetImportPath: "./w.tsx",
    widgetExportName: "myWidget",
  });
  assertStringIncludes(src, "import { myWidget as widget }");
});

Deno.test("output reads data-props from #root element", () => {
  const src = generateEmbedEntry({
    widgetImportPath: "./w.tsx",
    widgetExportName: "w",
  });
  assertStringIncludes(src, 'getElementById("root")');
  assertStringIncludes(src, 'getAttribute("data-props")');
});

Deno.test("output calls widget.props.validate", () => {
  const src = generateEmbedEntry({
    widgetImportPath: "./w.tsx",
    widgetExportName: "w",
  });
  assertStringIncludes(src, "widget.props.validate(raw)");
});

Deno.test("output imports Preact render", () => {
  const src = generateEmbedEntry({
    widgetImportPath: "./w.tsx",
    widgetExportName: "w",
  });
  assertStringIncludes(src, "import { render");
  assertStringIncludes(src, "preact");
});
