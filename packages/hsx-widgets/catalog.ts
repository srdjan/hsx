/**
 * Widget Catalog - Registry for GenUI widgets with AI tool generation.
 *
 * Collects GenUIWidget definitions and produces:
 * - AI tool definitions (for Claude, OpenAI, etc.)
 * - Rendered HTML from tool calls (tag + raw props)
 * - Design guidelines for AI system prompts
 *
 * @module catalog
 */

import { renderHtml } from "@srdjan/hsx/core";
import type { GenUIWidget } from "./genui-widget.ts";
import { ok, fail, type Result } from "./result.ts";
import { wrapWidgetContent } from "./widget-wrapper.ts";
import {
  RAW_WIDGET_TAG,
  RAW_WIDGET_DESCRIPTION,
  RAW_WIDGET_SCHEMA,
  validateRawWidgetProps,
  renderRawWidget,
} from "./raw-widget.ts";

// =============================================================================
// Types
// =============================================================================

/** Errors from catalog operations. */
export type GenUIError =
  | { readonly tag: "unknown_widget"; readonly widgetTag: string }
  | { readonly tag: "validation_error"; readonly message: string; readonly field?: string }
  | { readonly tag: "render_error"; readonly message: string };

/** AI tool definition produced from a GenUIWidget. */
export type ToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
};

/** Options for creating a catalog. */
export type CatalogOptions = {
  /** Design system description included in guidelines(). */
  readonly designSystem?: string;
};

/** A registry of GenUI widgets that can be used as AI tools. */
export type WidgetCatalog = {
  /** All registered widgets by tag name. */
  readonly widgets: ReadonlyMap<string, ErasedGenUIWidget>;

  /** Generate tool definitions for an AI provider. */
  toTools(): ReadonlyArray<ToolDefinition>;

  /** Render a widget by tag name with raw props (validated internally). */
  render(tag: string, rawProps: unknown): Result<string, GenUIError>;

  /** Get design guidelines as an AI-readable string. */
  guidelines(): string;
};

// =============================================================================
// Tool Definition Generation
// =============================================================================

function widgetToToolDefinition(widget: ErasedGenUIWidget): ToolDefinition {
  let description = widget.description;

  if (widget.examples && widget.examples.length > 0) {
    const exampleLines = widget.examples.map(
      (ex) => `  User: "${ex.prompt}" -> props: ${JSON.stringify(ex.props)}`,
    );
    description += "\n\nExamples:\n" + exampleLines.join("\n");
  }

  return {
    name: widget.tag,
    description,
    parameters: widget.schema,
  };
}

// =============================================================================
// Widget Rendering
// =============================================================================

function toValidationError(
  error: { readonly tag: string; readonly message: string; readonly field?: string },
): GenUIError {
  return {
    tag: "validation_error",
    message: error.message,
    field: error.tag === "validation_error" ? error.field : undefined,
  };
}

function renderWidget(
  widget: ErasedGenUIWidget,
  rawProps: unknown,
): Result<string, GenUIError> {
  const validated = widget.props.validate(rawProps);
  if (!validated.ok) {
    return fail(toValidationError(validated.error));
  }

  try {
    const content = widget.render(validated.value);
    const wrapped = wrapWidgetContent(widget.tag, content, widget.styles, {
      shadow: widget.shadow,
    });
    const html = renderHtml(wrapped);
    return ok(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail({ tag: "render_error", message });
  }
}

// =============================================================================
// Guidelines Generation
// =============================================================================

function generateGuidelines(
  widgets: ReadonlyMap<string, ErasedGenUIWidget>,
  designSystem?: string,
): string {
  const sections: string[] = [];

  if (designSystem) {
    sections.push("## Design System\n\n" + designSystem);
  }

  sections.push("## Available Widgets\n");

  for (const [tag, widget] of widgets) {
    const lines: string[] = [];
    lines.push(`### ${tag}`);
    lines.push(widget.description);
    if (widget.category) {
      lines.push(`Category: ${widget.category}`);
    }
    lines.push(`Parameters: ${JSON.stringify(widget.schema, null, 2)}`);
    sections.push(lines.join("\n"));
  }

  sections.push(
    "## Constraints\n\n" +
    "- Use only the widgets listed above. Do not generate raw HTML unless the raw-widget tool is available.\n" +
    "- Provide all required props as specified in each widget's parameters schema.\n" +
    "- Keep data concise - widgets render server-side so large payloads increase response time.",
  );

  return sections.join("\n\n");
}

// =============================================================================
// Public API
// =============================================================================

/**
 * A GenUIWidget with its props type erased for storage in the catalog.
 * The render function is stored as (props: unknown) => Renderable
 * because the catalog validates props before calling render.
 */
// deno-lint-ignore no-explicit-any
type ErasedGenUIWidget = GenUIWidget<any>;

/**
 * Create a WidgetCatalog from an array of GenUI widgets.
 *
 * The catalog registers widgets by tag name and provides methods
 * to generate AI tool definitions, render widgets from tool calls,
 * and produce design guidelines for AI system prompts.
 *
 * @example
 * ```ts
 * const catalog = createCatalog([weatherWidget, chartWidget]);
 * const tools = catalog.toTools(); // Pass to AI provider
 *
 * // When AI calls a tool:
 * const result = catalog.render("hsx-weather", { city: "London" });
 * ```
 */
export function createCatalog(
  widgets: ReadonlyArray<ErasedGenUIWidget>,
  options: CatalogOptions = {},
): WidgetCatalog {
  const widgetMap = new Map<string, ErasedGenUIWidget>();

  for (const widget of widgets) {
    if (widgetMap.has(widget.tag)) {
      throw new Error(`Duplicate widget tag: ${widget.tag}`);
    }
    widgetMap.set(widget.tag, widget);
  }

  const frozenMap: ReadonlyMap<string, ErasedGenUIWidget> = widgetMap;

  // Raw widget tool definition (always available)
  const rawToolDef: ToolDefinition = {
    name: RAW_WIDGET_TAG,
    description: RAW_WIDGET_DESCRIPTION,
    parameters: RAW_WIDGET_SCHEMA,
  };

  return {
    widgets: frozenMap,

    toTools(): ReadonlyArray<ToolDefinition> {
      const tools = [...frozenMap.values()].map(widgetToToolDefinition);
      tools.push(rawToolDef);
      return tools;
    },

    render(tag: string, rawProps: unknown): Result<string, GenUIError> {
      // Special case: raw widget bypasses the VNode pipeline
      if (tag === RAW_WIDGET_TAG) {
        const validated = validateRawWidgetProps(rawProps);
        if (!validated.ok) {
          return fail(toValidationError(validated.error));
        }
        return ok(renderRawWidget(validated.value));
      }

      const widget = frozenMap.get(tag);
      if (!widget) {
        return fail({ tag: "unknown_widget", widgetTag: tag });
      }
      return renderWidget(widget, rawProps);
    },

    guidelines(): string {
      return generateGuidelines(frozenMap, options.designSystem);
    },
  };
}
