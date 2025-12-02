import type { Route, Id, HsxSwap, HsxTrigger, Urlish, Params } from "./hsx-types.ts";
import type { VNode, Renderable } from "./jsx-runtime.ts";

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

  // Event handlers (for completeness, though SSR ignores them)
  // These are typed loosely since they're typically removed in SSR
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

declare global {
  namespace JSX {
    /**
     * What a JSX element evaluates to at runtime.
     * Includes VNode and all Renderable types (for Fragment, etc.)
     */
    type Element = VNode | Renderable;

    interface ElementChildrenAttribute {
      children: {};
    }

    // deno-lint-ignore no-explicit-any
    interface IntrinsicElements {
      // Form elements with HSX support
      form: FormAttrs & HsxAttrs & ExtensibleAttrs;
      button: ButtonAttrs & HsxAttrs & ExtensibleAttrs;
      a: AnchorAttrs & HsxAttrs & { behavior?: "boost" | "link" } & ExtensibleAttrs;

      // Div with HSX support (common HTMX target)
      div: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      span: GlobalAttrs & HsxAttrs & ExtensibleAttrs;

      // Form inputs
      input: InputAttrs & ExtensibleAttrs;
      textarea: TextareaAttrs & ExtensibleAttrs;
      select: SelectAttrs & ExtensibleAttrs;
      option: OptionAttrs & ExtensibleAttrs;
      optgroup: GlobalAttrs & { label?: string; disabled?: boolean } & ExtensibleAttrs;
      label: LabelAttrs & ExtensibleAttrs;
      fieldset: GlobalAttrs & { disabled?: boolean; form?: string; name?: string } & ExtensibleAttrs;
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
      source: GlobalAttrs & { src?: string; type?: string; srcSet?: string; srcset?: string; sizes?: string; media?: string } & ExtensibleAttrs;
      track: GlobalAttrs & { src?: string; kind?: string; srclang?: string; label?: string; default?: boolean } & ExtensibleAttrs;
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
      body: GlobalAttrs & ExtensibleAttrs;
      main: GlobalAttrs & ExtensibleAttrs;
      header: GlobalAttrs & ExtensibleAttrs;
      footer: GlobalAttrs & ExtensibleAttrs;
      nav: GlobalAttrs & ExtensibleAttrs;
      section: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      article: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      aside: GlobalAttrs & ExtensibleAttrs;
      h1: GlobalAttrs & ExtensibleAttrs;
      h2: GlobalAttrs & ExtensibleAttrs;
      h3: GlobalAttrs & ExtensibleAttrs;
      h4: GlobalAttrs & ExtensibleAttrs;
      h5: GlobalAttrs & ExtensibleAttrs;
      h6: GlobalAttrs & ExtensibleAttrs;
      hgroup: GlobalAttrs & ExtensibleAttrs;
      address: GlobalAttrs & ExtensibleAttrs;

      // Text content
      p: GlobalAttrs & ExtensibleAttrs;
      hr: GlobalAttrs & ExtensibleAttrs;
      pre: GlobalAttrs & ExtensibleAttrs;
      blockquote: GlobalAttrs & { cite?: string } & ExtensibleAttrs;
      ol: GlobalAttrs & { reversed?: boolean; start?: number; type?: "1" | "a" | "A" | "i" | "I" } & ExtensibleAttrs;
      ul: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      li: GlobalAttrs & { value?: number } & ExtensibleAttrs;
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
      time: GlobalAttrs & { dateTime?: string; datetime?: string } & ExtensibleAttrs;
      data: GlobalAttrs & { value?: string } & ExtensibleAttrs;

      // Tables
      table: GlobalAttrs & ExtensibleAttrs;
      caption: GlobalAttrs & ExtensibleAttrs;
      thead: GlobalAttrs & ExtensibleAttrs;
      tbody: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      tfoot: GlobalAttrs & ExtensibleAttrs;
      tr: GlobalAttrs & HsxAttrs & ExtensibleAttrs;
      th: TableCellAttrs & ExtensibleAttrs;
      td: TableCellAttrs & ExtensibleAttrs;
      col: GlobalAttrs & { span?: number } & ExtensibleAttrs;
      colgroup: GlobalAttrs & { span?: number } & ExtensibleAttrs;

      // Interactive
      details: GlobalAttrs & { open?: boolean } & ExtensibleAttrs;
      summary: GlobalAttrs & ExtensibleAttrs;
      dialog: GlobalAttrs & { open?: boolean } & ExtensibleAttrs;
      menu: GlobalAttrs & ExtensibleAttrs;

      // Embedded content
      object: GlobalAttrs & { data?: string; type?: string; name?: string; width?: number | string; height?: number | string; form?: string } & ExtensibleAttrs;
      embed: GlobalAttrs & { src?: string; type?: string; width?: number | string; height?: number | string } & ExtensibleAttrs;
      param: GlobalAttrs & { name?: string; value?: string } & ExtensibleAttrs;
      picture: GlobalAttrs & ExtensibleAttrs;
      canvas: GlobalAttrs & { width?: number | string; height?: number | string } & ExtensibleAttrs;
      svg: GlobalAttrs & { xmlns?: string; viewBox?: string; width?: number | string; height?: number | string; fill?: string; stroke?: string } & ExtensibleAttrs;

      // Template
      template: GlobalAttrs & ExtensibleAttrs;
      slot: GlobalAttrs & { name?: string } & ExtensibleAttrs;

      // Output
      output: GlobalAttrs & { htmlFor?: string; for?: string; form?: string; name?: string } & ExtensibleAttrs;
      progress: GlobalAttrs & { value?: number; max?: number } & ExtensibleAttrs;
      meter: GlobalAttrs & { value?: number; min?: number; max?: number; low?: number; high?: number; optimum?: number } & ExtensibleAttrs;
    }
  }
}

export {};
