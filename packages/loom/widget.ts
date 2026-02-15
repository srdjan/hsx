/**
 * Widget protocol - the core abstraction for dual-compile components.
 *
 * A Widget<P> defines a pure render function of props, plus validation
 * and optional data loading. The rendering context (SSR vs embed) decides
 * what JSX means at compile time.
 *
 * @module widget
 */

import type { Renderable } from "@srdjan/hsx/core";
import type { Result } from "./result.ts";

// =============================================================================
// Error Types
// =============================================================================

/** Errors that can occur during widget validation or loading. */
export type WidgetError =
  | { readonly tag: "validation_error"; readonly message: string; readonly field?: string }
  | { readonly tag: "load_error"; readonly message: string; readonly cause?: unknown };

// =============================================================================
// Props Validation
// =============================================================================

/** Validates raw input into typed props. */
export type PropsValidator<P> = {
  readonly validate: (raw: unknown) => Result<P, WidgetError>;
};

// =============================================================================
// Widget Protocol
// =============================================================================

/**
 * A Widget is a self-contained UI component that can render in both SSR
 * and client-side contexts.
 *
 * The `tag` must follow custom element naming: `loom-${string}` (contains a hyphen).
 * The `render` function is a pure function of props - no side effects.
 *
 * @typeParam P - The props type for this widget
 */
export type Widget<P> = {
  /** Custom element tag name. Must start with "loom-". */
  readonly tag: `loom-${string}`;

  /** Validates raw input (query params, attributes, etc.) into typed props. */
  readonly props: PropsValidator<P>;

  /** Scoped CSS styles for this widget. */
  readonly styles: string;

  /** Pure render function producing a VNode tree from validated props. */
  readonly render: (props: P) => Renderable;

  /** Optional async data loader. Called server-side to hydrate props from route params. */
  readonly load?: (params: Record<string, string>) => Promise<Result<P, WidgetError>>;

  /** Shadow DOM mode for client-side rendering. Defaults to "none" in SSR. */
  readonly shadow?: "open" | "closed" | "none";

  /** Attributes to observe for client-side reactivity. */
  readonly observed?: ReadonlyArray<keyof P & string>;
};
