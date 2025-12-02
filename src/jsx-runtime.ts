export type ComponentType<P = any> = (props: P) => Renderable;

export type VNodeType = string | ComponentType<any>;

export interface VNode<P = any> {
  type: VNodeType;
  props: P & { children?: Renderable };
}

export type Renderable =
  | VNode<any>
  | string
  | number
  | boolean
  | null
  | undefined
  | Renderable[];

// JSX runtime entrypoints for `jsx: "react-jsx"`
export function jsx(type: VNodeType, props: any): VNode {
  return { type, props };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function Fragment(props: { children?: Renderable }) {
  return props.children ?? null;
}
