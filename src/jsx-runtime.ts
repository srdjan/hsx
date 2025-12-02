/**
 * HSX JSX Runtime - Internal module for JSX transformation.
 *
 * This module provides the JSX factory functions required by TypeScript's
 * `react-jsx` transform. It is automatically used when you configure
 * `jsxImportSource: "hsx"` in your deno.json or tsconfig.
 *
 * You typically don't import from this module directly - use the main
 * `@srdjan/hsx` module instead.
 *
 * @module
 */

/** Props type for JSX elements */
export type JsxProps = Record<string, unknown> & { children?: Renderable };

/** Props passed to a component, always include optional children */
export type ComponentProps<P> = P & { children?: Renderable };

/** A function component that renders JSX */
export type ComponentType<P = {}> = (props: ComponentProps<P>) => Renderable;

/** The type of a VNode - either an HTML tag name or a component function */
export type VNodeType = string | ComponentType;

/** A virtual node in the JSX tree */
export interface VNode<P = JsxProps> {
  type: VNodeType;
  props: ComponentProps<P>;
}

/** Any value that can be rendered in JSX */
export type Renderable =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | Renderable[];

/**
 * JSX factory function for elements with a single child.
 * Called automatically by the TypeScript JSX transform.
 *
 * @param type - The element tag name or component function
 * @param props - The element props including children
 * @returns A VNode representing the element
 */
export function jsx(type: VNodeType, props: JsxProps): VNode {
  return { type, props };
}

/**
 * JSX factory function for elements with multiple children.
 * Called automatically by the TypeScript JSX transform.
 *
 * @param type - The element tag name or component function
 * @param props - The element props including children
 * @returns A VNode representing the element
 */
export const jsxs = jsx;

/**
 * JSX factory function for development mode.
 * Called automatically by the TypeScript JSX transform in dev mode.
 *
 * @param type - The element tag name or component function
 * @param props - The element props including children
 * @returns A VNode representing the element
 */
export const jsxDEV = jsx;

/**
 * JSX Fragment component for grouping elements without a wrapper.
 *
 * @param props - Props containing optional children
 * @returns The children without any wrapping element
 *
 * @example
 * ```tsx
 * import { Fragment } from "@srdjan/hsx";
 *
 * function List() {
 *   return (
 *     <Fragment>
 *       <li>One</li>
 *       <li>Two</li>
 *     </Fragment>
 *   );
 * }
 * ```
 */
export function Fragment(props: { children?: Renderable }): Renderable {
  return props.children ?? null;
}
