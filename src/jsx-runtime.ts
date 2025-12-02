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

// JSX runtime entrypoints for `jsx: "react-jsx"`
export function jsx(type: VNodeType, props: JsxProps): VNode {
  return { type, props };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function Fragment(props: { children?: Renderable }): Renderable {
  return props.children ?? null;
}
