/**
 * Raw Widget - Escape hatch for AI-generated HTML.
 *
 * Unlike regular widgets, the raw widget bypasses the VNode render pipeline
 * because its content is arbitrary HTML that cannot be represented as a VNode tree.
 * The catalog handles raw widget rendering directly at the HTML string level.
 *
 * Content is sanitized via allowlist and rendered inside a
 * Declarative Shadow DOM for style isolation.
 *
 * @module raw-widget
 */

import { escapeHtml } from "@srdjan/hsx/core";
import { ok, fail, type Result } from "./result.ts";
import type { WidgetError } from "./widget.ts";
import { sanitizeHtml } from "./sanitize.ts";

// =============================================================================
// Types
// =============================================================================

/** Props for the raw widget. */
export type RawWidgetProps = {
  readonly title: string;
  readonly html: string;
};

/** JSON Schema and description exposed to AI models as a tool. */
export const RAW_WIDGET_TAG = "hsx-raw" as const;

export const RAW_WIDGET_DESCRIPTION =
  "Renders custom HTML content in an isolated container. " +
  "Use only when no other widget fits the need. " +
  "The HTML should use CSS custom properties (--color-text-primary, etc.) for theming. " +
  "Script tags are not supported - use only HTML and CSS.";

export const RAW_WIDGET_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "A short snake_case identifier for this content",
    },
    html: {
      type: "string",
      description:
        "HTML fragment to render. Must use CSS variables for colors. " +
        "Structure: <style> block first, then HTML content. No <script> tags.",
    },
  },
  required: ["title", "html"],
};

// =============================================================================
// Validation
// =============================================================================

export function validateRawWidgetProps(
  raw: unknown,
): Result<RawWidgetProps, WidgetError> {
  if (typeof raw !== "object" || raw === null) {
    return fail({ tag: "validation_error", message: "Expected an object" });
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string" || obj.title.length === 0) {
    return fail({
      tag: "validation_error",
      message: "Title is required",
      field: "title",
    });
  }
  if (typeof obj.html !== "string" || obj.html.length === 0) {
    return fail({
      tag: "validation_error",
      message: "HTML content is required",
      field: "html",
    });
  }
  return ok({ title: obj.title, html: obj.html });
}

// =============================================================================
// Rendering
// =============================================================================

const RAW_WIDGET_HOST_STYLES = `:host {
  display: block;
  color: var(--hsx-text, var(--color-text-primary, #1f2937));
  font-family: system-ui, -apple-system, sans-serif;
}`;

/**
 * Render a raw widget directly to an HTML string.
 *
 * Bypasses the VNode pipeline because the content is arbitrary HTML.
 * Wraps in Declarative Shadow DOM for style isolation.
 * Sanitizes content via allowlist-based HTML sanitizer.
 */
export function renderRawWidget(props: RawWidgetProps): string {
  const sanitized = sanitizeHtml(props.html);

  return (
    `<hsx-raw data-widget="hsx-raw" data-raw-title="${escapeHtml(props.title)}">` +
    `<template shadowrootmode="closed">` +
    `<style>${RAW_WIDGET_HOST_STYLES}</style>` +
    sanitized +
    `</template>` +
    `</hsx-raw>`
  );
}

