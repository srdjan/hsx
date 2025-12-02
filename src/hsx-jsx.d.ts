import type { Route, Id, HsxSwap, HsxTrigger, Urlish, Params } from "./hsx-types.ts";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      form: Omit<HTMLElementTagNameMap["form"], "action" | "method"> & {
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
        action?: string | Route<string, any>;
        method?: "get" | "post";
      };
      button: HTMLElementTagNameMap["button"] & {
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
      a: HTMLElementTagNameMap["a"] & {
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
        behavior?: "boost" | "link";
      };
      div: HTMLElementTagNameMap["div"] & {
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
    }
  }
}

export {};
