/**
 * Loading state component for progressive rendering.
 *
 * @module loading
 */

import type { Renderable } from "./jsx-runtime.ts";
import { jsx } from "./jsx-runtime.ts";

// =============================================================================
// Types
// =============================================================================

export type LoadingProps = {
  readonly messages?: readonly string[];
  readonly id?: string;
};

// =============================================================================
// Component
// =============================================================================

const LOADING_STYLES = `@keyframes hsx-loading-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.hsx-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--hsx-muted, var(--color-text-secondary, #6b7280));
  font-size: 0.875rem;
  animation: hsx-loading-pulse 1.5s ease-in-out infinite;
}
.hsx-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: hsx-loading-pulse 1.5s ease-in-out infinite;
}
.hsx-loading-dot:nth-child(2) { animation-delay: 0.2s; }
.hsx-loading-dot:nth-child(3) { animation-delay: 0.4s; }`;

/**
 * A loading placeholder. Designed to be swapped out by HTMX when real content arrives.
 *
 * @example
 * ```tsx
 * <Loading id="widget-loading" messages={["Preparing chart..."]} />
 * ```
 */
export function Loading(props: LoadingProps): Renderable {
  const displayMessage = props.messages?.[0] ?? "Loading...";

  const containerProps: Record<string, unknown> = {
    "data-loading": "true",
    children: [
      jsx("style", { children: LOADING_STYLES }),
      jsx("div", {
        class: "hsx-loading",
        children: [
          jsx("span", { class: "hsx-loading-dot" }),
          jsx("span", { class: "hsx-loading-dot" }),
          jsx("span", { class: "hsx-loading-dot" }),
          jsx("span", { children: displayMessage }),
        ],
      }),
    ],
  };

  if (props.id) {
    containerProps.id = props.id;
  }

  return jsx("div", containerProps);
}
