/**
 * Preact Custom Element Wrapper - Registers a Widget as a web component.
 *
 * Reads props from `data-props` JSON attribute, validates them through
 * the widget's validator, and renders with Preact into the element's
 * shadow root (or light DOM if shadow is "none").
 *
 * @module preact-element
 */

import { render as preactRender, h } from "npm:preact@10.25.4";
import type { Widget } from "../widget.ts";
import type { Result } from "../result.ts";

// =============================================================================
// Custom Element Registration
// =============================================================================

/**
 * Register a Widget as a custom element.
 *
 * The custom element:
 * - Reads initial props from the `data-props` JSON attribute
 * - Validates props through `widget.props.validate()`
 * - Renders via Preact into shadow DOM (or light DOM if `shadow: "none"`)
 * - Injects `widget.styles` into the shadow root when using shadow DOM
 * - Re-renders when observed attributes change
 *
 * @example
 * ```ts
 * import { toCustomElement } from "@srdjan/hsx-widgets/embed/preact-element";
 * import { greetingWidget } from "./greeting-widget.tsx";
 *
 * toCustomElement(greetingWidget);
 * // Now <hsx-greeting data-props='{"name":"World","message":"Hi!"}'>
 * // renders as a web component
 * ```
 */
export function toCustomElement<P>(widget: Widget<P>): void {
  const observedAttrs = [
    "data-props",
    ...(widget.observed ?? []).map((attr) => `data-${attr}`),
  ];

  class WidgetElement extends HTMLElement {
    private mountPoint: HTMLElement | ShadowRoot;

    constructor() {
      super();

      const shadowMode = widget.shadow ?? "none";
      if (shadowMode === "none") {
        this.mountPoint = this;
      } else {
        this.mountPoint = this.attachShadow({ mode: shadowMode });
      }
    }

    static get observedAttributes(): string[] {
      return observedAttrs;
    }

    connectedCallback(): void {
      this.renderWidget();
    }

    attributeChangedCallback(): void {
      if (this.isConnected) {
        this.renderWidget();
      }
    }

    private renderWidget(): void {
      const propsJson = this.getAttribute("data-props");
      if (!propsJson) return;

      let raw: unknown;
      try {
        raw = JSON.parse(propsJson);
      } catch {
        console.error(`[hsx] Invalid JSON in data-props for <${widget.tag}>`);
        return;
      }

      const result: Result<P, unknown> = widget.props.validate(raw);
      if (!result.ok) {
        console.error(`[hsx] Validation failed for <${widget.tag}>:`, result.error);
        return;
      }

      // Inject styles into shadow root if using shadow DOM
      if (this.mountPoint instanceof ShadowRoot && widget.styles.length > 0) {
        // Only inject styles once
        if (!this.mountPoint.querySelector("style[data-hsx]")) {
          const styleEl = document.createElement("style");
          styleEl.setAttribute("data-hsx", "");
          styleEl.textContent = widget.styles;
          this.mountPoint.prepend(styleEl);
        }
      }

      // Create a container div for Preact to render into
      let container = this.mountPoint.querySelector("[data-hsx-root]") as HTMLElement | null;
      if (!container) {
        container = document.createElement("div");
        container.setAttribute("data-hsx-root", "");
        this.mountPoint.appendChild(container);
      }

      // Render with Preact
      // The widget.render function is compiled with Preact's JSX factory
      // in embed context, so it returns Preact VNodes.
      const vnode = (widget.render as (props: P) => unknown)(result.value);
      preactRender(vnode as Parameters<typeof preactRender>[0], container);
    }
  }

  // Only register if not already defined
  if (!customElements.get(widget.tag)) {
    customElements.define(widget.tag, WidgetElement);
  }
}
