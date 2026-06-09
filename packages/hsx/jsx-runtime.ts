/**
 * HSX JSX Runtime - Internal module for JSX transformation.
 *
 * This module provides the JSX factory functions required by TypeScript's
 * `react-jsx` transform. It is automatically used when you configure
 * `jsxImportSource: "@srdjan/hsx"` in your deno.json or tsconfig.
 *
 * You typically don't import from this module directly - use the main
 * `@srdjan/hsx` module instead.
 *
 * @module
 */

import type {
  HsxExt,
  HsxSwap,
  HsxTrigger,
  Id,
  Params,
  Urlish,
} from "./hsx-types.ts";

// =============================================================================
// Core JSX Types
// =============================================================================

/** Props type for JSX elements */
export type JsxProps = Record<string, unknown> & { children?: Renderable };

/** Props passed to a component, always include optional children */
export type ComponentProps<P> = P & { children?: Renderable };

/** A function component that renders JSX */
// deno-lint-ignore ban-types
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

// =============================================================================
// HSX-specific attributes (map to hx-* attributes)
// =============================================================================

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
  /** HTMX extension(s) to enable. Maps to hx-ext. */
  ext?: HsxExt;
  /** SSE connection URL. Maps to sse-connect. */
  sseConnect?: string;
  /** SSE swap mapping (event:target). Maps to sse-swap. */
  sseSwap?: string;
  /** Element(s) to receive the htmx-request class while the request is in flight. Maps to hx-indicator. */
  indicator?: Id<string> | string;
  /** Element(s) to disable for the duration of the request. Maps to hx-disable (HTMX 4; replaces v2 hx-disabled-elt). */
  disable?: Id<string> | string;
  /** Request synchronization/queuing spec, e.g. "this:abort". Maps to hx-sync. */
  sync?: string;
  /** Confirmation prompt shown before issuing the request. Maps to hx-confirm. */
  confirm?: string;
  /** Select a subset of the response to swap in. Maps to hx-select. */
  select?: Id<string> | string;
  /** Push the request URL into browser history (true/false or an explicit URL). Maps to hx-push-url. */
  pushUrl?: boolean | string;
  /** Mark this element for out-of-band swapping (true or a swap spec). Maps to hx-swap-oob. */
  swapOob?: boolean | string;
};

// =============================================================================
// Standard HTML global attributes
// =============================================================================

/** Global attributes available on all HTML elements */
interface GlobalAttrs {
  // Core attributes
  id?: string;
  className?: string;
  class?: string;
  style?: string | Record<string, string | number>;
  title?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  hidden?: boolean;
  tabIndex?: number;
  tabindex?: number;

  // Accessibility
  role?: string;

  // Data attributes (allow any data-* attribute)
  [key: `data-${string}`]: string | number | boolean | undefined;

  // ARIA attributes (allow any aria-* attribute)
  [key: `aria-${string}`]: string | number | boolean | undefined;
}

// =============================================================================
// Element-specific attributes
// =============================================================================

interface InputAttrs extends GlobalAttrs {
  type?:
    | "text"
    | "password"
    | "email"
    | "number"
    | "tel"
    | "url"
    | "search"
    | "date"
    | "time"
    | "datetime-local"
    | "month"
    | "week"
    | "color"
    | "file"
    | "hidden"
    | "checkbox"
    | "radio"
    | "range"
    | "submit"
    | "reset"
    | "button"
    | "image";
  name?: string;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  checked?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  minLength?: number;
  minlength?: number;
  maxLength?: number;
  maxlength?: number;
  pattern?: string;
  autocomplete?: string;
  autofocus?: boolean;
  multiple?: boolean;
  accept?: string;
  size?: number;
  list?: string;
  form?: string;
}

interface TextareaAttrs extends GlobalAttrs {
  name?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  rows?: number;
  cols?: number;
  minLength?: number;
  minlength?: number;
  maxLength?: number;
  maxlength?: number;
  wrap?: "soft" | "hard";
  autofocus?: boolean;
  form?: string;
}

interface SelectAttrs extends GlobalAttrs {
  name?: string;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  size?: number;
  autofocus?: boolean;
  form?: string;
}

interface OptionAttrs extends GlobalAttrs {
  value?: string | number;
  selected?: boolean;
  disabled?: boolean;
  label?: string;
}

interface LabelAttrs extends GlobalAttrs {
  htmlFor?: string;
  for?: string;
  form?: string;
}

interface ImgAttrs extends GlobalAttrs {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
  decoding?: "sync" | "async" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  crossorigin?: "anonymous" | "use-credentials";
  srcSet?: string;
  srcset?: string;
  sizes?: string;
  referrerPolicy?: string;
  referrerpolicy?: string;
}

interface AnchorAttrs extends GlobalAttrs {
  href?: string | Urlish;
  target?: string;
  rel?: string;
  download?: string | boolean;
  type?: string;
  referrerPolicy?: string;
  referrerpolicy?: string;
}

interface FormAttrs extends GlobalAttrs {
  action?: string;
  method?: "get" | "post" | "dialog";
  encType?: string;
  enctype?: string;
  target?: string;
  noValidate?: boolean;
  novalidate?: boolean;
  acceptCharset?: string;
  autocomplete?: "on" | "off";
  name?: string;
}

interface ButtonAttrs extends GlobalAttrs {
  type?: "submit" | "reset" | "button";
  disabled?: boolean;
  name?: string;
  value?: string;
  form?: string;
  formAction?: string;
  formaction?: string;
  formMethod?: string;
  formmethod?: string;
  formNoValidate?: boolean;
  formnovalidate?: boolean;
  formTarget?: string;
  formtarget?: string;
  autofocus?: boolean;
}

interface MetaAttrs extends GlobalAttrs {
  name?: string;
  content?: string;
  httpEquiv?: string;
  charset?: string;
  charSet?: string;
  property?: string;
}

interface LinkAttrs extends GlobalAttrs {
  href?: string;
  rel?: string;
  type?: string;
  media?: string;
  sizes?: string;
  crossOrigin?: "anonymous" | "use-credentials";
  crossorigin?: "anonymous" | "use-credentials";
  as?: string;
  integrity?: string;
}

interface ScriptAttrs extends GlobalAttrs {
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: "anonymous" | "use-credentials";
  crossorigin?: "anonymous" | "use-credentials";
  integrity?: string;
  noModule?: boolean;
  nomodule?: boolean;
  nonce?: string;
}

interface StyleAttrs extends GlobalAttrs {
  type?: string;
  media?: string;
  nonce?: string;
}

interface TableCellAttrs extends GlobalAttrs {
  colSpan?: number;
  colspan?: number;
  rowSpan?: number;
  rowspan?: number;
  headers?: string;
  scope?: "row" | "col" | "rowgroup" | "colgroup";
}

interface IframeAttrs extends GlobalAttrs {
  src?: string;
  srcDoc?: string;
  srcdoc?: string;
  name?: string;
  width?: number | string;
  height?: number | string;
  sandbox?: string;
  allow?: string;
  allowFullscreen?: boolean;
  allowfullscreen?: boolean;
  loading?: "lazy" | "eager";
  referrerPolicy?: string;
  referrerpolicy?: string;
}

// Fallback for any unknown attributes
type ExtensibleAttrs = Record<string, unknown>;

/** Attributes common to SVG elements. Uses ExtensibleAttrs as a base since SVG
 *  has a very large attribute surface (presentation, geometry, filter primitives,
 *  etc.) and strict typing would be impractical for an HTML-focused SSR library. */
type SvgAttrs = GlobalAttrs & {
  xmlns?: string;
  viewBox?: string;
  width?: number | string;
  height?: number | string;
  x?: number | string;
  y?: number | string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  opacity?: number | string;
  transform?: string;
  d?: string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  points?: string;
  href?: string;
  "text-anchor"?: "start" | "middle" | "end";
  "dominant-baseline"?: string;
  "marker-end"?: string;
  "marker-start"?: string;
  "marker-mid"?: string;
} & ExtensibleAttrs;

// =============================================================================
// JSX Namespace - Exported for TypeScript JSX support
// =============================================================================

/**
 * JSX namespace for TypeScript JSX type checking.
 * This is automatically used when you configure `jsxImportSource: "@srdjan/hsx"`.
 */
// deno-lint-ignore no-namespace
export namespace JSX {
  /** What a JSX element evaluates to at runtime */
  export type Element = VNode | Renderable;

  /** Tells TypeScript how to extract children from props */
  export interface ElementChildrenAttribute {
    children: unknown;
  }

  /** Intrinsic HTML elements and their allowed attributes */
  export interface IntrinsicElements {
    // Form elements with HSX support
    form: FormAttrs & HsxAttrs & ExtensibleAttrs;
    button: ButtonAttrs & HsxAttrs & ExtensibleAttrs;
    a:
      & AnchorAttrs
      & HsxAttrs
      & { behavior?: "boost" | "link" }
      & ExtensibleAttrs;

    // Div with HSX support (common HTMX target)
    div: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    span: GlobalAttrs & HsxAttrs & ExtensibleAttrs;

    // Form inputs
    input: InputAttrs & HsxAttrs & ExtensibleAttrs;
    textarea: TextareaAttrs & HsxAttrs & ExtensibleAttrs;
    select: SelectAttrs & HsxAttrs & ExtensibleAttrs;
    option: OptionAttrs & ExtensibleAttrs;
    optgroup:
      & GlobalAttrs
      & { label?: string; disabled?: boolean }
      & ExtensibleAttrs;
    label: LabelAttrs & ExtensibleAttrs;
    fieldset:
      & GlobalAttrs
      & { disabled?: boolean; form?: string; name?: string }
      & ExtensibleAttrs;
    legend: GlobalAttrs & ExtensibleAttrs;

    // Media
    img: ImgAttrs & ExtensibleAttrs;
    video: GlobalAttrs & {
      src?: string;
      width?: number | string;
      height?: number | string;
      autoplay?: boolean;
      controls?: boolean;
      loop?: boolean;
      muted?: boolean;
      poster?: string;
      preload?: "none" | "metadata" | "auto";
      playsInline?: boolean;
      playsinline?: boolean;
    } & ExtensibleAttrs;
    audio: GlobalAttrs & {
      src?: string;
      autoplay?: boolean;
      controls?: boolean;
      loop?: boolean;
      muted?: boolean;
      preload?: "none" | "metadata" | "auto";
    } & ExtensibleAttrs;
    source: GlobalAttrs & {
      src?: string;
      type?: string;
      srcSet?: string;
      srcset?: string;
      sizes?: string;
      media?: string;
    } & ExtensibleAttrs;
    track: GlobalAttrs & {
      src?: string;
      kind?: string;
      srclang?: string;
      label?: string;
      default?: boolean;
    } & ExtensibleAttrs;
    iframe: IframeAttrs & ExtensibleAttrs;

    // Document metadata
    html: GlobalAttrs & ExtensibleAttrs;
    head: GlobalAttrs & ExtensibleAttrs;
    title: GlobalAttrs & ExtensibleAttrs;
    base: GlobalAttrs & { href?: string; target?: string } & ExtensibleAttrs;
    link: LinkAttrs & ExtensibleAttrs;
    meta: MetaAttrs & ExtensibleAttrs;
    style: StyleAttrs & ExtensibleAttrs;
    script: ScriptAttrs & ExtensibleAttrs;
    noscript: GlobalAttrs & ExtensibleAttrs;

    // Sections
    body: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    main: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    header: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    footer: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    nav: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    section: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    article: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    aside: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    h1: GlobalAttrs & ExtensibleAttrs;
    h2: GlobalAttrs & ExtensibleAttrs;
    h3: GlobalAttrs & ExtensibleAttrs;
    h4: GlobalAttrs & ExtensibleAttrs;
    h5: GlobalAttrs & ExtensibleAttrs;
    h6: GlobalAttrs & ExtensibleAttrs;
    hgroup: GlobalAttrs & ExtensibleAttrs;
    address: GlobalAttrs & ExtensibleAttrs;

    // Text content
    p: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    hr: GlobalAttrs & ExtensibleAttrs;
    pre: GlobalAttrs & ExtensibleAttrs;
    blockquote: GlobalAttrs & { cite?: string } & ExtensibleAttrs;
    ol: GlobalAttrs & HsxAttrs & {
      reversed?: boolean;
      start?: number;
      type?: "1" | "a" | "A" | "i" | "I";
    } & ExtensibleAttrs;
    ul: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    li: GlobalAttrs & HsxAttrs & { value?: number } & ExtensibleAttrs;
    dl: GlobalAttrs & ExtensibleAttrs;
    dt: GlobalAttrs & ExtensibleAttrs;
    dd: GlobalAttrs & ExtensibleAttrs;
    figure: GlobalAttrs & ExtensibleAttrs;
    figcaption: GlobalAttrs & ExtensibleAttrs;

    // Inline text
    em: GlobalAttrs & ExtensibleAttrs;
    strong: GlobalAttrs & ExtensibleAttrs;
    small: GlobalAttrs & ExtensibleAttrs;
    s: GlobalAttrs & ExtensibleAttrs;
    cite: GlobalAttrs & ExtensibleAttrs;
    q: GlobalAttrs & { cite?: string } & ExtensibleAttrs;
    dfn: GlobalAttrs & ExtensibleAttrs;
    abbr: GlobalAttrs & ExtensibleAttrs;
    code: GlobalAttrs & ExtensibleAttrs;
    var: GlobalAttrs & ExtensibleAttrs;
    samp: GlobalAttrs & ExtensibleAttrs;
    kbd: GlobalAttrs & ExtensibleAttrs;
    sub: GlobalAttrs & ExtensibleAttrs;
    sup: GlobalAttrs & ExtensibleAttrs;
    i: GlobalAttrs & ExtensibleAttrs;
    b: GlobalAttrs & ExtensibleAttrs;
    u: GlobalAttrs & ExtensibleAttrs;
    mark: GlobalAttrs & ExtensibleAttrs;
    ruby: GlobalAttrs & ExtensibleAttrs;
    rt: GlobalAttrs & ExtensibleAttrs;
    rp: GlobalAttrs & ExtensibleAttrs;
    bdi: GlobalAttrs & ExtensibleAttrs;
    bdo: GlobalAttrs & ExtensibleAttrs;
    br: GlobalAttrs & ExtensibleAttrs;
    wbr: GlobalAttrs & ExtensibleAttrs;
    time:
      & GlobalAttrs
      & { dateTime?: string; datetime?: string }
      & ExtensibleAttrs;
    data: GlobalAttrs & { value?: string } & ExtensibleAttrs;

    // Tables
    table: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    caption: GlobalAttrs & ExtensibleAttrs;
    thead: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    tbody: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    tfoot: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    tr: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
    th: TableCellAttrs & HsxAttrs & ExtensibleAttrs;
    td: TableCellAttrs & HsxAttrs & ExtensibleAttrs;
    col: GlobalAttrs & { span?: number } & ExtensibleAttrs;
    colgroup: GlobalAttrs & { span?: number } & ExtensibleAttrs;

    // Interactive
    details: GlobalAttrs & HsxAttrs & { open?: boolean } & ExtensibleAttrs;
    summary: GlobalAttrs & ExtensibleAttrs;
    dialog: GlobalAttrs & { open?: boolean } & ExtensibleAttrs;
    menu: GlobalAttrs & ExtensibleAttrs;

    // Embedded content
    object: GlobalAttrs & {
      data?: string;
      type?: string;
      name?: string;
      width?: number | string;
      height?: number | string;
      form?: string;
    } & ExtensibleAttrs;
    embed: GlobalAttrs & {
      src?: string;
      type?: string;
      width?: number | string;
      height?: number | string;
    } & ExtensibleAttrs;
    param: GlobalAttrs & { name?: string; value?: string } & ExtensibleAttrs;
    picture: GlobalAttrs & ExtensibleAttrs;
    canvas:
      & GlobalAttrs
      & { width?: number | string; height?: number | string }
      & ExtensibleAttrs;
    svg: SvgAttrs;

    // SVG elements
    g: SvgAttrs;
    rect: SvgAttrs;
    circle: SvgAttrs;
    ellipse: SvgAttrs;
    line: SvgAttrs;
    polyline: SvgAttrs;
    polygon: SvgAttrs;
    path: SvgAttrs;
    text: SvgAttrs;
    tspan: SvgAttrs;
    textPath: SvgAttrs;
    defs: SvgAttrs;
    symbol: SvgAttrs;
    use: SvgAttrs;
    marker: SvgAttrs;
    clipPath: SvgAttrs;
    mask: SvgAttrs;
    pattern: SvgAttrs;
    linearGradient: SvgAttrs;
    radialGradient: SvgAttrs;
    stop: SvgAttrs;
    filter: SvgAttrs;
    feGaussianBlur: SvgAttrs;
    feOffset: SvgAttrs;
    feMerge: SvgAttrs;
    feMergeNode: SvgAttrs;
    feBlend: SvgAttrs;
    feColorMatrix: SvgAttrs;
    foreignObject: SvgAttrs;

    // Template
    template: GlobalAttrs & ExtensibleAttrs;
    slot: GlobalAttrs & { name?: string } & ExtensibleAttrs;

    // Output
    output: GlobalAttrs & {
      htmlFor?: string;
      for?: string;
      form?: string;
      name?: string;
    } & ExtensibleAttrs;
    progress: GlobalAttrs & { value?: number; max?: number } & ExtensibleAttrs;
    meter: GlobalAttrs & {
      value?: number;
      min?: number;
      max?: number;
      low?: number;
      high?: number;
      optimum?: number;
    } & ExtensibleAttrs;
  }
}

// =============================================================================
// JSX Factory Functions
// =============================================================================

/**
 * Type guard: check if a value is a VNode (has `type` and `props`).
 */
export function isVNode(x: unknown): x is VNode {
  return (
    typeof x === "object" &&
    x !== null &&
    "type" in x &&
    "props" in x
  );
}

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
