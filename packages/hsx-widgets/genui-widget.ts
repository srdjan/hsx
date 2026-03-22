/**
 * GenUI Widget - Extends Widget<P> with AI model metadata.
 *
 * A GenUIWidget adds the information an AI model needs to select and
 * invoke a widget as a tool: a natural language description, a JSON Schema
 * for the props, optional few-shot examples, and a category.
 *
 * @module genui-widget
 */

import type { Widget } from "./widget.ts";

// =============================================================================
// Types
// =============================================================================

/** Categories for organizing widgets in the catalog. */
export type WidgetCategory =
  | "chart"
  | "diagram"
  | "interactive"
  | "display"
  | "form";

/**
 * A Widget extended with metadata for AI tool selection.
 *
 * The `description` and `schema` fields are exposed to the AI model
 * as the tool's description and parameters respectively.
 *
 * @typeParam P - The props type for this widget
 */
export type GenUIWidget<P> = Widget<P> & {
  /** Natural language description of what this widget renders and when to use it. */
  readonly description: string;

  /** JSON Schema for props, used to generate AI tool parameters. */
  readonly schema: Record<string, unknown>;

  /**
   * Optional example prompt-to-props mappings for few-shot guidance.
   * Included in tool descriptions to help the AI model generate correct props.
   */
  readonly examples?: ReadonlyArray<{
    readonly prompt: string;
    readonly props: P;
  }>;

  /** Widget category for catalog organization. */
  readonly category?: WidgetCategory;
};
