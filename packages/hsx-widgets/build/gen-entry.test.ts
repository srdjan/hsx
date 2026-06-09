/**
 * Unit tests for HSX Widgets embed entry point generator.
 *
 * Run with: deno test --allow-all packages/hsx-widgets/build/gen-entry.test.ts
 */

import {
  assertStringIncludes,
  assertThrows,
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

Deno.test("output safely quotes widget import paths", () => {
  const src = generateEmbedEntry({
    widgetImportPath: './widgets/"quoted".tsx',
    widgetExportName: "quotedWidget",
  });

  assertStringIncludes(src, 'from "./widgets/\\"quoted\\".tsx"');
});

Deno.test("rejects invalid widget export names", () => {
  assertThrows(
    () =>
      generateEmbedEntry({
        widgetImportPath: "./w.tsx",
        widgetExportName: "widget;console.log(1)",
      }),
    Error,
    "Invalid widget export name",
  );
});
