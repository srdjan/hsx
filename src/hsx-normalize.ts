import type { Route, Urlish, Params } from "./hsx-types.ts";

export interface RenderContext {
  depth: number;
  nodes: number;
  maxDepth?: number;
  maxNodes?: number;
  usesHtmx: boolean;
}

export type Props = Record<string, any>;

function isRoute(x: any): x is Route<string, any> {
  return x && typeof x.path === "string" && typeof x.build === "function";
}

function asUrl(urlish: Urlish, params?: Params): string {
  if (isRoute(urlish)) return urlish.build((params ?? {}) as any);
  return String(urlish);
}

function markHtmx(ctx: RenderContext) {
  ctx.usesHtmx = true;
}

function normalizeVerbs(
  next: Props,
  ctx: RenderContext,
  params?: Params,
): void {
  const verbs = ["get", "post", "put", "patch", "delete"] as const;
  for (const verb of verbs) {
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
  if (next.target !== undefined) {
    markHtmx(ctx);
    if (next["hx-target"] == null) {
      next["hx-target"] = next.target;
    }
    delete next.target;
  }

  if (next.swap !== undefined) {
    markHtmx(ctx);
    if (next["hx-swap"] == null) {
      next["hx-swap"] = next.swap;
    }
    delete next.swap;
  }

  if (next.trigger !== undefined) {
    markHtmx(ctx);
    if (next["hx-trigger"] == null) {
      next["hx-trigger"] = next.trigger;
    }
    delete next.trigger;
  }

  if (next.vals !== undefined) {
    markHtmx(ctx);
    if (next["hx-vals"] == null) {
      next["hx-vals"] = next.vals;
    }
    delete next.vals;
  }

  if (next.headers !== undefined) {
    markHtmx(ctx);
    if (next["hx-headers"] == null) {
      next["hx-headers"] = next.headers;
    }
    delete next.headers;
  }
}

export function normalizeFormProps(
  props: Props,
  ctx: RenderContext,
): Props {
  const next: Props = { ...props };
  const params = next.params as Params | undefined;
  if (params !== undefined) {
    delete next.params;
  }

  normalizeVerbs(next, ctx, params);
  normalizeNonVerb(next, ctx);

  // Optional: normalize action/method for non-HTMX fallback
  if (next.action == null) {
    const postUrl = next["hx-post"] as string | undefined;
    const getUrl = next["hx-get"] as string | undefined;
    if (postUrl || getUrl) {
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
  const next: Props = { ...props };
  const params = next.params as Params | undefined;
  if (params !== undefined) {
    delete next.params;
  }

  normalizeVerbs(next, ctx, params);
  normalizeNonVerb(next, ctx);

  return next;
}

export function normalizeAnchorProps(
  props: Props,
  ctx: RenderContext,
): Props {
  const next: Props = { ...props };
  const params = next.params as Params | undefined;
  if (params !== undefined) {
    delete next.params;
  }

  normalizeVerbs(next, ctx, params);
  normalizeNonVerb(next, ctx);

  const behavior = next.behavior as string | undefined;
  if (behavior !== undefined) {
    delete next.behavior;
    if (behavior === "boost") {
      markHtmx(ctx);
      if (next["hx-boost"] == null) {
        next["hx-boost"] = "true";
      }
    }
  }

  const href = next.href as Urlish | undefined;
  if (href && isRoute(href)) {
    next.href = asUrl(href, params);
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
  const next: Props = { ...props };
  const params = next.params as Params | undefined;
  if (params !== undefined) {
    delete next.params;
  }

  normalizeVerbs(next, ctx, params);
  normalizeNonVerb(next, ctx);

  return next;
}
