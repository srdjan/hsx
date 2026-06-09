/**
 * HSX Widgets - SSR-first component framework with embeddable web components.
 *
 * Define a Widget<P> once. Render it server-side through HSX, or compile
 * it as a standalone web component for embedding on third-party sites.
 *
 * @example
 * ```tsx
 * import { widgetToHsxComponent } from "@srdjan/hsx-widgets/ssr";
 * import type { Widget } from "@srdjan/hsx-widgets";
 *
 * const myWidget: Widget<{ name: string }> = {
 *   tag: "hsx-greeting",
 *   props: { validate: (raw) => ok({ name: String(raw.name) }) },
 *   styles: ".greeting { color: blue; }",
 *   render: ({ name }) => <div class="greeting">Hello, {name}!</div>,
 * };
 *
 * const route = widgetToHsxComponent(myWidget, { path: "/widgets/greeting/:name" });
 * ```
 *
 * @module
 */

// Result utilities
export { type Fail, fail, match, type Ok, ok, type Result } from "./result.ts";

// Widget protocol
export type { PropsValidator, Widget, WidgetError } from "./widget.ts";

// SSR adapter
export {
  widgetToHsxComponent,
  type WidgetToHsxOptions,
} from "./ssr-adapter.ts";

// Style collection (for hsxPage compatibility)
export {
  collectWidgetStyles,
  WidgetStyles,
  type WidgetStylesProps,
} from "./styles.ts";

// GenUI: Widget metadata for AI models
export type { GenUIWidget, WidgetCategory } from "./genui-widget.ts";

// GenUI: Widget catalog and tool definitions
export {
  type CatalogOptions,
  createCatalog,
  type GenUIError,
  type ToolDefinition,
  type WidgetCatalog,
} from "./catalog.ts";

// GenUI: Raw widget (AI-generated HTML escape hatch)
export type { RawWidgetProps } from "./raw-widget.ts";

// GenUI: Design guidelines for AI system prompts
export {
  createDesignGuidelines,
  type DesignGuidelines,
  formatForAI,
} from "./design-guidelines.ts";
