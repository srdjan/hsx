import type { Params, Route, Urlish } from "./hsx-types.ts";

export interface RenderContext {
  depth: number;
  nodes: number;
  maxDepth?: number;
  maxNodes?: number;
  usesHtmx: boolean;
  ancestors: string[];
  onElement?: (
    tag: string,
    props: Record<string, unknown>,
    ancestors: ReadonlyArray<string>,
  ) => void;
  /** override for HTMX script injection (true = force, false = disable) */
  injectHtmxOverride?: boolean;
}

export type Props = Record<string, unknown>;

/** HTTP verbs that map to hx-* attributes */
const HTTP_VERBS = ["get", "post", "put", "patch", "delete"] as const;

/** HSX attributes that map to hx-* attributes (non-verb) */
const HSX_NON_VERB_ATTRS = [
  ["target", "hx-target"],
  ["swap", "hx-swap"],
  ["trigger", "hx-trigger"],
  ["vals", "hx-vals"],
  ["headers", "hx-headers"],
  ["ext", "hx-ext"],
  ["sseConnect", "sse-connect"],
  ["sseSwap", "sse-swap"],
  ["indicator", "hx-indicator"],
  ["disableElt", "hx-disable"],
  ["sync", "hx-sync"],
  ["confirm", "hx-confirm"],
  ["select", "hx-select"],
  ["pushUrl", "hx-push-url"],
  ["swapOob", "hx-swap-oob"],
] as const;

/**
 * All HSX source prop keys (params + verbs + non-verb aliases). Used by
 * needsHsxNormalization to scan an element's own keys (usually 1-3) instead of
 * probing every HSX key on every element - keeps detection O(props), not
 * O(table), so the alias table is free to grow.
 */
const HSX_SOURCE_KEYS: ReadonlySet<string> = new Set<string>([
  "params",
  ...HTTP_VERBS,
  ...HSX_NON_VERB_ATTRS.map(([src]) => src),
]);

function isRoute(x: unknown): x is Route<string, unknown> {
  return (
    typeof x === "object" &&
    x !== null &&
    "path" in x &&
    typeof (x as Route<string, unknown>).path === "string" &&
    "build" in x &&
    typeof (x as Route<string, unknown>).build === "function"
  );
}

function asUrl(urlish: Urlish, params?: Params): string {
  if (isRoute(urlish)) return urlish.build((params ?? {}) as Params);
  return String(urlish);
}

function markHtmx(ctx: RenderContext): void {
  ctx.usesHtmx = true;
}

/**
 * Check if props contain any HSX attributes that need normalization.
 * Used to implement lazy copy - only spread props when mutation is needed.
 */
function needsHsxNormalization(props: Props): boolean {
  for (const key in props) {
    if (HSX_SOURCE_KEYS.has(key) && props[key] !== undefined) return true;
  }
  return false;
}

function normalizeVerbs(
  next: Props,
  ctx: RenderContext,
  params?: Params,
): void {
  for (const verb of HTTP_VERBS) {
    const value = next[verb] as Urlish | undefined;
    if (value !== undefined) {
      const url = asUrl(value, params);
      const hxName = `hx-${verb}`;
      markHtmx(ctx);
      if (next[hxName] == null) {
        next[hxName] = url;
      }
      delete next[verb];
    }
  }
}

function normalizeNonVerb(next: Props, ctx: RenderContext): void {
  for (const [srcAttr, hxAttr] of HSX_NON_VERB_ATTRS) {
    const value = next[srcAttr];
    if (value !== undefined) {
      markHtmx(ctx);
      if (next[hxAttr] == null) {
        // hx-push-url / hx-swap-oob need the literal string "true" (a bare/valueless
        // attribute is falsy to HTMX). Boolean false is left as-is so propsToAttrs
        // omits the attribute entirely - emitting "false" would wrongly mark a
        // swap-oob element as out-of-band (HTMX keys on attribute presence).
        next[hxAttr] = value === true ? "true" : value;
      }
      delete next[srcAttr];
    }
  }
}

/**
 * Base normalization: lazily copies props only if HSX attributes are present.
 * Returns [props (possibly copied), params] tuple.
 */
function baseNormalize(
  props: Props,
  ctx: RenderContext,
): Props {
  // Fast path: no HSX attributes, return props unchanged
  if (!needsHsxNormalization(props)) {
    return props;
  }

  // Slow path: copy and mutate
  const next: Props = { ...props };
  const params = next.params as Params | undefined;
  if (params !== undefined) {
    delete next.params;
  }

  normalizeVerbs(next, ctx, params);
  normalizeNonVerb(next, ctx);

  return next;
}

export function normalizeFormProps(
  props: Props,
  ctx: RenderContext,
): Props {
  // Reject multiple HTTP verbs on a single form
  let verbCount = 0;
  const verbs: string[] = [];
  for (const verb of HTTP_VERBS) {
    if (props[verb] !== undefined) {
      verbCount++;
      verbs.push(verb);
    }
  }
  if (verbCount > 1) {
    throw new Error(
      `<form> cannot have multiple HTTP verb attributes. ` +
        `Found: ${verbs.join(", ")}. Use only one verb per form.`,
    );
  }

  let next = baseNormalize(props, ctx);

  // Form-specific: normalize action/method for non-HTMX fallback
  // This may require a copy even if baseNormalize didn't copy
  if (next.action == null) {
    const postUrl = next["hx-post"] as string | undefined;
    const getUrl = next["hx-get"] as string | undefined;
    if (postUrl || getUrl) {
      // Need to copy if we haven't already
      if (next === props) {
        next = { ...props };
      }
      next.action = postUrl ?? getUrl;
      if (next.method == null) {
        next.method = postUrl ? "post" : "get";
      }
    }
  }

  return next;
}

export function normalizeAnchorProps(
  props: Props,
  ctx: RenderContext,
): Props {
  const behavior = props.behavior as string | undefined;
  const href = props.href as Urlish | undefined;
  const hasRouteHref = href !== undefined && isRoute(href);

  // Check if we need anchor-specific normalization
  const needsAnchorNorm = behavior !== undefined || hasRouteHref;

  // Fast path: no HSX attrs and no anchor-specific attrs
  if (!needsHsxNormalization(props) && !needsAnchorNorm) {
    return props;
  }

  // Extract params before baseNormalize (which deletes it from the copy)
  const params = props.params as Params | undefined;

  // Get base normalization (may or may not copy)
  let next = baseNormalize(props, ctx);

  // Anchor-specific normalization
  if (needsAnchorNorm) {
    // Need to copy if base didn't copy
    if (next === props) {
      next = { ...props };
    }

    if (behavior !== undefined) {
      delete next.behavior;
      if (behavior === "boost") {
        markHtmx(ctx);
        if (next["hx-boost"] == null) {
          next["hx-boost"] = "true";
        }
      }
    }

    if (hasRouteHref) {
      next.href = asUrl(href, params);
    }
  }

  return next;
}

/**
 * Generic HSX normalization for tags without special handling (button, div, etc.).
 */
export function normalizeGenericHsxProps(
  props: Props,
  ctx: RenderContext,
): Props {
  return baseNormalize(props, ctx);
}
