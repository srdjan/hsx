/**
 * HsxBus - optional configuration for the client event bus.
 *
 * The bus runtime (/static/hsx-bus.js) is auto-injected before </body>
 * whenever any `emit`/`on`/`act` attribute is used, exactly like the HTMX
 * script. You only need <HsxBus/> to configure the runtime (a non-default
 * delegation root, or debug logging).
 *
 * It renders ONLY a <meta name="hsx-bus-config"> tag - never the <script>.
 * The body-injection logic remains the single owner of the script tag, so
 * there is no way to double-inject. Mount it once, in <head>.
 *
 * Note: mounting <HsxBus/> alone does not force the script. If you configure
 * the bus but use no emit/on attributes anywhere, pass `injectBus: true` to
 * render/renderHtml to force the runtime in.
 *
 * @example
 * ```tsx
 * <head>
 *   <title>App</title>
 *   <HsxBus debug />
 * </head>
 * ```
 *
 * @module
 */

import { jsx, type Renderable } from "./jsx-runtime.ts";

export interface HsxBusProps {
  /** CSS selector for the delegation/dispatch root. Default: "body". */
  root?: string;
  /** Log every publish and action to the console. Default: false. */
  debug?: boolean;
}

export function HsxBus(props: HsxBusProps = {}): Renderable {
  const cfg: Record<string, unknown> = {};
  if (props.root !== undefined && props.root !== "body") cfg.root = props.root;
  if (props.debug) cfg.debug = true;
  return jsx("meta", {
    name: "hsx-bus-config",
    content: JSON.stringify(cfg),
  });
}
