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
  type HsxComponent,
  hsxComponent,
  type HttpMethod,
} from "@srdjan/hsx/components";
import type { Renderable } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";

import type { Widget, WidgetError } from "./widget.ts";
import type { Result } from "./result.ts";
import { wrapWidgetContent } from "./widget-wrapper.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for converting a Widget to an HsxComponent. */
export type WidgetToHsxOptions = {
  /** The route path for this widget (e.g., "/widgets/greeting/:name"). */
  readonly path: string;
  /** HTTP methods to handle. Defaults to ["GET"]. */
  readonly methods?: readonly HttpMethod[];
  /**
   * When true, the wrapper `<div>` omits the inline `<style>` tag.
   * Use this with `WidgetStyles` in `<head>` for hsxPage compatibility.
   * @default false
   */
  readonly hoistStyles?: boolean;
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

function createWidgetWrapper<P>(
  widget: Widget<P>,
  hoistStyles: boolean,
): (props: P) => Renderable {
  return (props: P): Renderable =>
    wrapWidgetContent(widget.tag, widget.render(props), widget.styles, {
      shadow: widget.shadow,
      hoistStyles,
    });
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert a Widget<P> into an HsxComponent that can be served as a route.
 *
 * The adapter:
 * - Calls `widget.load(params)` if present, otherwise validates query params
 * - Wraps rendered output in `<div data-widget="hsx-...">` with scoped `<style>`
 * - Returns proper error responses for validation/load failures
 *
 * @example
 * ```tsx
 * import { widgetToHsxComponent } from "@srdjan/hsx-widgets/ssr";
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
  const wrapperRender = createWidgetWrapper(
    widget,
    options.hoistStyles ?? false,
  );

  return hsxComponent(options.path, {
    methods: options.methods ? [...options.methods] : ["GET"],

    async handler(req: Request, params: Record<string, string>): Promise<P> {
      const result = await resolveProps(widget, req, params);

      if (!result.ok) {
        const error = result.error;
        // hsxComponent's catch block always returns 500 regardless of error type.
        // Format a descriptive message for the server log.
        const message = error.tag === "validation_error"
          ? `Validation error: ${error.message}${
            error.field ? ` (field: ${error.field})` : ""
          }`
          : `Load error: ${error.message}`;

        throw new Error(message);
      }

      return result.value;
    },

    render: wrapperRender,
  });
}
