import type { Route, Urlish, Params } from "./hsx-types.ts";

export interface RenderContext {
  depth: number;
  nodes: number;
  maxDepth?: number;
  maxNodes?: number;
  usesHtmx: boolean;
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
] as const;

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
  // Check for params
  if (props.params !== undefined) return true;

  // Check for HTTP verb attributes
  for (const verb of HTTP_VERBS) {
    if (props[verb] !== undefined) return true;
  }

  // Check for non-verb HSX attributes
  for (const [src] of HSX_NON_VERB_ATTRS) {
    if (props[src] !== undefined) return true;
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
    if (next[srcAttr] !== undefined) {
      markHtmx(ctx);
      if (next[hxAttr] == null) {
        next[hxAttr] = next[srcAttr];
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

export function normalizeButtonProps(
  props: Props,
  ctx: RenderContext,
): Props {
  return baseNormalize(props, ctx);
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

  // Get base normalization (may or may not copy)
  let next = baseNormalize(props, ctx);

  // Anchor-specific normalization
  if (needsAnchorNorm) {
    // Need to copy if base didn't copy
    if (next === props) {
      next = { ...props };
    }

    const params = props.params as Params | undefined;

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
 * Generic HSX normalization for non-form/button/a tags, e.g. <div>
 * that use get/post/target/swap/trigger/vals/headers.
 */
export function normalizeGenericHsxProps(
  props: Props,
  ctx: RenderContext,
): Props {
  return baseNormalize(props, ctx);
}
