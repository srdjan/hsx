/**
 * SSR Adapter - Bridges Widget<P> into the HSX component pipeline.
 *
 * Wraps a Widget into an HsxComponent so it can be served as a route
 * in an HSX application. The adapter handles props validation, data
 * loading, scoped style injection, and error responses.
 *
 * @module ssr-adapter
 */

import {
  hsxComponent,
  type HsxComponent,
  type HttpMethod,
} from "@srdjan/hsx/components";
import { renderHtml } from "@srdjan/hsx/core";
import type { Renderable } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";

import type { Widget, WidgetError } from "./widget.ts";
import { ok, fail, type Result } from "./result.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for converting a Widget to an HsxComponent. */
export type WidgetToHsxOptions = {
  /** The route path for this widget (e.g., "/widgets/greeting/:name"). */
  readonly path: string;
  /** HTTP methods to handle. Defaults to ["GET"]. */
  readonly methods?: readonly HttpMethod[];
};

// =============================================================================
// Internal: Props Resolution
// =============================================================================

/**
 * Resolve props for a widget from a request.
 *
 * If the widget has a `load` function, calls it with route params.
 * Otherwise, validates query parameters through the widget's props validator.
 */
async function resolveProps<P>(
  widget: Widget<P>,
  req: Request,
  params: Record<string, string>,
): Promise<Result<P, WidgetError>> {
  if (widget.load) {
    return widget.load(params);
  }

  // Fall back to validating query params
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    raw[key] = value;
  }
  // Merge route params into raw (route params take precedence)
  for (const [key, value] of Object.entries(params)) {
    raw[key] = value;
  }
  return widget.props.validate(raw);
}

// =============================================================================
// Internal: Widget Wrapper Component
// =============================================================================

/**
 * Creates a wrapper component that renders the widget output inside a
 * `<div data-widget="...">` with scoped `<style>`.
 */
function createWidgetWrapper<P>(
  widget: Widget<P>,
): (props: P) => Renderable {
  return (props: P): Renderable => {
    const children: Renderable[] = [];

    if (widget.styles.length > 0) {
      children.push(jsx("style", { children: widget.styles }));
    }

    children.push(widget.render(props));

    return jsx("div", {
      "data-widget": widget.tag,
      children,
    });
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert a Widget<P> into an HsxComponent that can be served as a route.
 *
 * The adapter:
 * - Calls `widget.load(params)` if present, otherwise validates query params
 * - Wraps rendered output in `<div data-widget="loom-...">` with scoped `<style>`
 * - Returns proper error responses for validation/load failures
 *
 * @example
 * ```tsx
 * import { widgetToHsxComponent } from "@srdjan/loom/ssr";
 *
 * const GreetingRoute = widgetToHsxComponent(greetingWidget, {
 *   path: "/widgets/greeting/:name",
 * });
 *
 * // Use in server routing:
 * if (GreetingRoute.match(pathname)) return GreetingRoute.handle(req);
 * ```
 */
export function widgetToHsxComponent<P>(
  widget: Widget<P>,
  options: WidgetToHsxOptions,
): HsxComponent<string, Record<string, string>, P> {
  const wrapperRender = createWidgetWrapper(widget);

  return hsxComponent(options.path, {
    methods: options.methods ? [...options.methods] : ["GET"],

    async handler(req: Request, params: Record<string, string>): Promise<P> {
      const result = await resolveProps(widget, req, params);

      if (!result.ok) {
        const error = result.error;
        const status = error.tag === "validation_error" ? 400 : 500;
        const message = error.tag === "validation_error"
          ? `Validation error: ${error.message}${error.field ? ` (field: ${error.field})` : ""}`
          : `Load error: ${error.message}`;

        // Throw with a status marker so hsxComponent's catch block returns 500.
        // We use a custom error that the handler recognizes.
        throw new WidgetHandlerError(message, status);
      }

      return result.value;
    },

    render: wrapperRender,
  });
}

/**
 * Internal error type for widget handler failures.
 * Carries an HTTP status code for proper error responses.
 */
export class WidgetHandlerError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WidgetHandlerError";
    this.status = status;
  }
}
