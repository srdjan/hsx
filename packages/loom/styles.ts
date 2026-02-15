/**
 * Style collection utilities for Loom widgets in hsxPage contexts.
 *
 * When rendering widgets inside an hsxPage, `<style>` tags must live in
 * `<head>`. These utilities collect and deduplicate widget CSS so the user
 * can place a single `<style>` block in the document head.
 *
 * @module styles
 */

import type { Renderable } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";

/** The subset of Widget fields needed for style collection. */
type Styleable = Pick<import("./widget.ts").Widget<never>, "tag" | "styles">;

// =============================================================================
// Style Collection
// =============================================================================

/**
 * Collect and deduplicate CSS from a list of widgets.
 *
 * Deduplication is by widget tag: if the same widget appears multiple times
 * in the array, its styles are included only once. Order is preserved (first
 * occurrence wins).
 *
 * @example
 * ```ts
 * const css = collectWidgetStyles([greetingWidget, counterWidget]);
 * // Returns concatenated, deduplicated CSS string
 * ```
 */
export function collectWidgetStyles(widgets: ReadonlyArray<Styleable>): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const widget of widgets) {
    if (seen.has(widget.tag)) continue;
    seen.add(widget.tag);
    if (widget.styles.length > 0) {
      parts.push(widget.styles);
    }
  }

  return parts.join("\n");
}

// =============================================================================
// WidgetStyles Component
// =============================================================================

/** Props for the WidgetStyles component. */
export type WidgetStylesProps = {
  readonly widgets: ReadonlyArray<Styleable>;
};

/**
 * JSX component that renders a `<style>` tag with collected widget CSS.
 *
 * Place this inside `<head>` when using widgets within an hsxPage.
 * Returns null (no output) when all widgets have empty styles.
 *
 * @example
 * ```tsx
 * <head>
 *   <WidgetStyles widgets={[greetingWidget, counterWidget]} />
 * </head>
 * ```
 */
export function WidgetStyles(props: WidgetStylesProps): Renderable {
  const css = collectWidgetStyles(props.widgets);
  if (css.length === 0) return null;
  return jsx("style", { children: css });
}
