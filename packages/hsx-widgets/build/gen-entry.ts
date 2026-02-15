/**
 * Entry Point Generator - Produces client-side bootstrap code for widgets.
 *
 * Generates a TypeScript entry file that imports a widget, validates props
 * from the DOM, and renders it with Preact. Avoids hand-writing boilerplate
 * per widget.
 *
 * @module gen-entry
 */

// =============================================================================
// Types
// =============================================================================

export type GenEntryOptions = {
  /** Import path to the widget module (relative or absolute). */
  readonly widgetImportPath: string;
  /** Named export of the widget from the module. */
  readonly widgetExportName: string;
};

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate a TypeScript entry file that bootstraps a widget on the client.
 *
 * The generated code:
 * 1. Imports the widget definition
 * 2. Reads `data-props` from the `#root` element
 * 3. Validates props through the widget's validator
 * 4. Renders via Preact into the root container
 *
 * @returns A string of TypeScript source code ready for esbuild compilation.
 */
export function generateEmbedEntry(options: GenEntryOptions): string {
  return `// Auto-generated HSX Widgets embed entry point
import { render, h } from "npm:preact@10.25.4";
import { ${options.widgetExportName} as widget } from "${options.widgetImportPath}";

const root = document.getElementById("root");
if (root) {
  const propsJson = root.getAttribute("data-props");
  if (propsJson) {
    try {
      const raw = JSON.parse(propsJson);
      const result = widget.props.validate(raw);
      if (result.ok) {
        const vnode = widget.render(result.value);
        render(vnode, root);
      } else {
        console.error("[hsx] Validation failed:", result.error);
      }
    } catch (e) {
      console.error("[hsx] Failed to parse props:", e);
    }
  }
}
`;
}
