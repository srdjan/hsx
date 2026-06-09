/**
 * HSX Lens manifest extraction.
 *
 * The collector renders explicit page samples and observes raw HSX attributes
 * before normalization through renderHtml's onElement hook. It does not call
 * component handlers or synthesize application requests.
 *
 * @module manifest
 */

import type { AgentDescriptor, HttpMethod } from "@srdjan/hsx";
import { type Renderable, renderHtml } from "@srdjan/hsx/core";

// =============================================================================
// Public types
// =============================================================================

export type HsxPageSample = {
  readonly name: string;
  readonly path: string;
  readonly description?: string;
  readonly render: () => Renderable;
};

export type HsxLensComponent = {
  readonly path: string;
  readonly methods: readonly HttpMethod[];
  readonly agent?: AgentDescriptor;
  build(params: Record<string, unknown>): string;
};

export type HsxLensWidget = {
  readonly tag: string;
  readonly description?: string;
  readonly schema?: Record<string, unknown>;
  readonly category?: string;
  readonly shadow?: "open" | "closed" | "none";
  readonly observed?: ReadonlyArray<string>;
};

export type HsxManifestPage = {
  readonly name: string;
  readonly path: string;
  readonly description?: string;
};

export type HsxManifestComponent = {
  readonly path: string;
  readonly methods: readonly HttpMethod[];
  readonly agent?: {
    readonly name: string;
    readonly description: string;
    readonly method: HttpMethod;
    readonly schema: Record<string, unknown>;
  };
};

export type HsxManifestWidget = {
  readonly tag: string;
  readonly description?: string;
  readonly schema?: Record<string, unknown>;
  readonly category?: string;
  readonly shadow?: "open" | "closed" | "none";
  readonly observed?: ReadonlyArray<string>;
};

export type HsxTarget = {
  readonly selector: `#${string}`;
  readonly id: string;
  readonly page: string;
  readonly pagePath: string;
  readonly tag: string;
  readonly elementPath: string;
};

export type HsxInteraction = {
  readonly id: string;
  readonly page: string;
  readonly pagePath: string;
  readonly tag: string;
  readonly elementPath: string;
  readonly method?: HttpMethod;
  readonly sourceAttr?: string;
  readonly url?: string;
  readonly routePath?: string;
  readonly target?: string;
  readonly swap?: string;
  readonly trigger?: string;
  readonly indicator?: string;
  readonly select?: string;
  readonly ext?: string;
  readonly sseConnect?: string;
  readonly sseSwap?: string;
  readonly pushUrl?: string;
  readonly sync?: string;
  readonly confirm?: string;
  readonly swapOob?: string;
  readonly vals?: Record<string, unknown>;
  readonly headers?: Record<string, unknown>;
};

export type HsxWarning =
  | {
    readonly tag: "page_render_error";
    readonly page: string;
    readonly pagePath: string;
    readonly message: string;
  }
  | {
    readonly tag: "unresolved_route";
    readonly page: string;
    readonly pagePath: string;
    readonly elementPath: string;
    readonly routePath: string;
    readonly message: string;
  }
  | {
    readonly tag: "missing_target";
    readonly page: string;
    readonly pagePath: string;
    readonly elementPath: string;
    readonly selector: string;
    readonly attr: "target" | "indicator" | "select";
    readonly message: string;
  }
  | {
    readonly tag: "duplicate_component_route";
    readonly route: string;
    readonly message: string;
  }
  | {
    readonly tag: "duplicate_agent_tool";
    readonly tool: string;
    readonly message: string;
  };

export type HsxManifest = {
  readonly version: 1;
  readonly appName: string;
  readonly generatedAt: string;
  readonly pages: readonly HsxManifestPage[];
  readonly components: readonly HsxManifestComponent[];
  readonly widgets: readonly HsxManifestWidget[];
  readonly targets: readonly HsxTarget[];
  readonly interactions: readonly HsxInteraction[];
  readonly warnings: readonly HsxWarning[];
};

export type HsxManifestOptions = {
  readonly appName: string;
  readonly pages?: ReadonlyArray<HsxPageSample>;
  readonly components?: ReadonlyArray<HsxLensComponent>;
  readonly widgets?: ReadonlyArray<HsxLensWidget>;
};

// =============================================================================
// Internal helpers
// =============================================================================

type Props = Record<string, unknown>;

type PageCollection = {
  readonly targets: HsxTarget[];
  readonly interactions: HsxInteraction[];
  readonly warnings: HsxWarning[];
};

const VERB_ATTRS = [
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["patch", "PATCH"],
  ["delete", "DELETE"],
] as const satisfies ReadonlyArray<readonly [string, HttpMethod]>;

const INTERACTION_ATTRS = [
  "target",
  "swap",
  "trigger",
  "indicator",
  "select",
  "ext",
  "sseConnect",
  "sseSwap",
  "pushUrl",
  "sync",
  "confirm",
  "swapOob",
  "vals",
  "headers",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return undefined;
}

function pathString(
  ancestors: ReadonlyArray<string>,
  current: string,
): string {
  return [...ancestors, current].join(" > ");
}

function isRoute(value: unknown): value is {
  readonly path: string;
  build(params: Record<string, unknown>): string;
} {
  return isRecord(value) &&
    typeof value.path === "string" &&
    typeof value.build === "function";
}

function isSimpleIdSelector(selector: string): selector is `#${string}` {
  return /^#[A-Za-z][A-Za-z0-9_.:-]*$/.test(selector);
}

function firstVerb(
  props: Props,
): readonly [string, HttpMethod, unknown] | null {
  for (const [attr, method] of VERB_ATTRS) {
    const value = props[attr];
    if (value !== undefined) return [attr, method, value];
  }
  return null;
}

function hasInteractionProps(props: Props): boolean {
  if (firstVerb(props)) return true;
  for (const attr of INTERACTION_ATTRS) {
    if (props[attr] !== undefined) return true;
  }
  return false;
}

function collectTarget(
  page: HsxPageSample,
  tag: string,
  props: Props,
  elementPath: string,
): HsxTarget | null {
  const id = asString(props.id);
  if (!id) return null;
  return {
    selector: `#${id}`,
    id,
    page: page.name,
    pagePath: page.path,
    tag,
    elementPath,
  };
}

function resolveVerbUrl(args: {
  readonly page: HsxPageSample;
  readonly elementPath: string;
  readonly sourceAttr: string;
  readonly value: unknown;
  readonly params: Record<string, unknown> | undefined;
  readonly warnings: HsxWarning[];
}): Pick<HsxInteraction, "url" | "routePath"> {
  const { value, params, page, elementPath, warnings } = args;

  if (isRoute(value)) {
    try {
      return {
        routePath: value.path,
        url: value.build(params ?? {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        tag: "unresolved_route",
        page: page.name,
        pagePath: page.path,
        elementPath,
        routePath: value.path,
        message,
      });
      return { routePath: value.path };
    }
  }

  return { url: asString(value) };
}

function collectInteraction(
  page: HsxPageSample,
  tag: string,
  props: Props,
  elementPath: string,
  index: number,
  warnings: HsxWarning[],
): HsxInteraction | null {
  if (!hasInteractionProps(props)) return null;

  const verb = firstVerb(props);
  const params = asRecord(props.params);
  const resolved = verb
    ? resolveVerbUrl({
      page,
      elementPath,
      sourceAttr: verb[0],
      value: verb[2],
      params,
      warnings,
    })
    : {};

  return {
    id: `${page.path || "/"}:${index}`,
    page: page.name,
    pagePath: page.path,
    tag,
    elementPath,
    method: verb?.[1],
    sourceAttr: verb?.[0],
    ...resolved,
    target: asString(props.target),
    swap: asString(props.swap),
    trigger: asString(props.trigger),
    indicator: asString(props.indicator),
    select: asString(props.select),
    ext: asString(props.ext),
    sseConnect: asString(props.sseConnect),
    sseSwap: asString(props.sseSwap),
    pushUrl: asString(props.pushUrl),
    sync: asString(props.sync),
    confirm: asString(props.confirm),
    swapOob: asString(props.swapOob),
    vals: asRecord(props.vals),
    headers: asRecord(props.headers),
  };
}

function collectPage(page: HsxPageSample): PageCollection {
  const targets: HsxTarget[] = [];
  const interactions: HsxInteraction[] = [];
  const warnings: HsxWarning[] = [];
  let index = 0;

  try {
    renderHtml(page.render(), {
      onElement(tag, props, ancestors) {
        index++;
        const elementPath = pathString(ancestors, tag);
        const target = collectTarget(page, tag, props, elementPath);
        if (target) targets.push(target);

        const interaction = collectInteraction(
          page,
          tag,
          props,
          elementPath,
          index,
          warnings,
        );
        if (interaction) interactions.push(interaction);
      },
    });
  } catch (error) {
    warnings.push({
      tag: "page_render_error",
      page: page.name,
      pagePath: page.path,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { targets, interactions, warnings };
}

function agentSummary(
  agent: AgentDescriptor | undefined,
): HsxManifestComponent["agent"] {
  if (!agent) return undefined;
  return {
    name: agent.name,
    description: agent.description,
    method: agent.method,
    schema: agent.schema,
  };
}

function collectComponentWarnings(
  components: ReadonlyArray<HsxLensComponent>,
): HsxWarning[] {
  const warnings: HsxWarning[] = [];
  const routes = new Set<string>();
  const tools = new Set<string>();

  for (const component of components) {
    for (const method of component.methods) {
      const route = `${method} ${component.path}`;
      if (routes.has(route)) {
        warnings.push({
          tag: "duplicate_component_route",
          route,
          message: `Duplicate component route: ${route}`,
        });
      }
      routes.add(route);
    }

    if (component.agent) {
      const tool = component.agent.name;
      if (tools.has(tool)) {
        warnings.push({
          tag: "duplicate_agent_tool",
          tool,
          message: `Duplicate agent tool name: ${tool}`,
        });
      }
      tools.add(tool);
    }
  }

  return warnings;
}

function collectMissingTargetWarnings(
  interactions: ReadonlyArray<HsxInteraction>,
  targets: ReadonlyArray<HsxTarget>,
): HsxWarning[] {
  const known = new Set(targets.map((target) => target.selector));
  const warnings: HsxWarning[] = [];

  for (const interaction of interactions) {
    const candidates = [
      ["target", interaction.target],
      ["indicator", interaction.indicator],
      ["select", interaction.select],
    ] as const;

    for (const [attr, selector] of candidates) {
      if (!selector || !isSimpleIdSelector(selector) || known.has(selector)) {
        continue;
      }
      warnings.push({
        tag: "missing_target",
        page: interaction.page,
        pagePath: interaction.pagePath,
        elementPath: interaction.elementPath,
        selector,
        attr,
        message:
          `No element with id "${selector}" was found in rendered page samples.`,
      });
    }
  }

  return warnings;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a static HSX hypermedia manifest from explicit samples.
 *
 * Page samples are rendered so HSX Lens can inspect author-time HSX attributes.
 * Component handlers are not called.
 */
export function createHsxManifest(options: HsxManifestOptions): HsxManifest {
  const pages = options.pages ?? [];
  const components = options.components ?? [];
  const widgets = options.widgets ?? [];
  const pageCollections = pages.map(collectPage);

  const targets = pageCollections.flatMap((entry) => entry.targets);
  const interactions = pageCollections.flatMap((entry) => entry.interactions);
  const warnings = [
    ...pageCollections.flatMap((entry) => entry.warnings),
    ...collectComponentWarnings(components),
    ...collectMissingTargetWarnings(interactions, targets),
  ];

  return {
    version: 1,
    appName: options.appName,
    generatedAt: new Date().toISOString(),
    pages: pages.map((page) => ({
      name: page.name,
      path: page.path,
      ...(page.description !== undefined
        ? { description: page.description }
        : {}),
    })),
    components: components.map((component) => {
      const agent = agentSummary(component.agent);
      return {
        path: component.path,
        methods: component.methods,
        ...(agent ? { agent } : {}),
      };
    }),
    widgets: widgets.map((widget) => ({
      tag: widget.tag,
      ...(widget.description !== undefined
        ? { description: widget.description }
        : {}),
      ...(widget.schema !== undefined ? { schema: widget.schema } : {}),
      ...(widget.category !== undefined ? { category: widget.category } : {}),
      ...(widget.shadow !== undefined ? { shadow: widget.shadow } : {}),
      ...(widget.observed !== undefined ? { observed: widget.observed } : {}),
    })),
    targets,
    interactions,
    warnings,
  };
}
