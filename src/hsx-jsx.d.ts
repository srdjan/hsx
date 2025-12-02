import type { Route, Id, HsxSwap, HsxTrigger, Urlish, Params } from "./hsx-types.ts";
import type { VNode } from "./jsx-runtime.ts";

type HsxAttrs = {
  get?: Urlish;
  post?: Urlish;
  put?: Urlish;
  patch?: Urlish;
  delete?: Urlish;
  params?: Params;
  target?: Id<string> | string;
  swap?: HsxSwap;
  trigger?: HsxTrigger;
  vals?: Params;
  headers?: Record<string, string>;
};

type BaseAttrs = Record<string, unknown>;

declare global {
  namespace JSX {
    // What a JSX element evaluates to at runtime (HSX renders VNodes).
    type Element = VNode;

    interface ElementChildrenAttribute {
      children: {};
    }

    // Allow any HTML-like tag name, then layer HSX-only props onto key tags.
    interface IntrinsicElements {
      [elemName: string]: BaseAttrs;
      form: BaseAttrs &
        HsxAttrs & {
          action?: string | Route<string, any>;
          method?: "get" | "post";
        };
      button: BaseAttrs & HsxAttrs;
      a: BaseAttrs &
        HsxAttrs & {
          behavior?: "boost" | "link";
        };
      div: BaseAttrs & HsxAttrs;
    }
  }
}

export {};
