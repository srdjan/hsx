import { hsxComponent, hsxPage, id } from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";

// =============================================================================
// Types
// =============================================================================

type AccentName = "indigo" | "emerald" | "amber" | "rose";
type DemoScene = "launch" | "ops" | "settings";
type ToggleKey = "theme" | "contrast" | "motion";

type PageConfig = {
  readonly theme: "light" | "dark";
  readonly accent: AccentName;
  readonly contrast: boolean;
  readonly motion: boolean;
};

type PageState = {
  readonly config: PageConfig;
  readonly scene: DemoScene;
};

type AccentTokens = {
  readonly hue: string;
  readonly label: string;
};

type SceneMeta = {
  readonly label: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly proof: ReadonlyArray<string>;
};

type ReferenceCard = {
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly snippet: string;
};

const ids = {
  playground: id("playground-shell"),
};

const DEFAULT_ACCENT: AccentName = "emerald";
const DEFAULT_SCENE: DemoScene = "launch";

const ACCENTS: Readonly<Record<AccentName, AccentTokens>> = {
  indigo: { hue: "266", label: "Indigo" },
  emerald: { hue: "160", label: "Emerald" },
  amber: { hue: "80", label: "Amber" },
  rose: { hue: "350", label: "Rose" },
};

const REFERENCE_CARDS: ReadonlyArray<ReferenceCard> = [
  {
    label: "Layout",
    title: "Compose with readable attributes",
    body:
      "Use container, stack, cluster, and grid together instead of utility-class soup.",
    snippet:
      `<section data-layout="grid" data-grid-min="md" data-gap="4">\n` +
      `  <article data-surface="card">...</article>\n` +
      `</section>`,
  },
  {
    label: "Surfaces",
    title: "Reach hierarchy through cards and notices",
    body:
      "Auras gives containment and status styling without custom component wrappers.",
    snippet:
      `<aside data-surface="notice" data-status="warning">\n` +
      `  <strong>Heads up</strong>\n` +
      `</aside>`,
  },
  {
    label: "Prose",
    title: "Make text-heavy content readable",
    body:
      "Wrap content in prose mode for measure, spacing, links, quotes, and code blocks.",
    snippet:
      `<article data-ui="prose">\n` +
      `  <h2>Readable by default</h2>\n` +
      `  <p>...</p>\n` +
      `</article>`,
  },
  {
    label: "Forms",
    title: "Style native controls, not custom clones",
    body:
      "Inputs, selects, ranges, switches, and button variants inherit the same token system.",
    snippet:
      `<label>\n` +
      `  Email\n` +
      `  <input type="email" aria-invalid="true" />\n` +
      `</label>`,
  },
  {
    label: "Data",
    title: "Show progress and tables with HTML",
    body:
      "Progress, meter, and table styling stay semantic and adapt to theme changes automatically.",
    snippet:
      `<progress value="68" max="100">68%</progress>\n` +
      `<table>...</table>`,
  },
  {
    label: "Theme",
    title: "Switch axes through attributes and tokens",
    body:
      "Dark mode, contrast, motion, and accent hue all come from a tiny amount of page state.",
    snippet:
      `<html data-theme="dark" data-contrast="more">\n` +
      `<style>:root { --hue-primary: 160; }</style>`,
  },
];

// =============================================================================
// Parsing and URL state
// =============================================================================

function parseScene(raw: string | null): DemoScene {
  switch (raw) {
    case "launch":
    case "ops":
    case "settings":
      return raw;
    default:
      return DEFAULT_SCENE;
  }
}

function parseConfig(url: URL): PageConfig {
  const accent = url.searchParams.get("accent");
  return {
    theme: url.searchParams.get("theme") === "dark" ? "dark" : "light",
    accent:
      accent === "indigo" || accent === "amber" || accent === "rose"
        ? accent
        : DEFAULT_ACCENT,
    contrast: url.searchParams.get("contrast") === "more",
    motion: url.searchParams.get("motion") === "reduce",
  };
}

function parseState(url: URL): PageState {
  return {
    config: parseConfig(url),
    scene: parseScene(url.searchParams.get("scene")),
  };
}

function buildSearchParams(state: PageState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.config.theme === "dark") params.set("theme", "dark");
  if (state.config.accent !== DEFAULT_ACCENT) {
    params.set("accent", state.config.accent);
  }
  if (state.config.contrast) params.set("contrast", "more");
  if (state.config.motion) params.set("motion", "reduce");
  if (state.scene !== DEFAULT_SCENE) params.set("scene", state.scene);
  return params;
}

function hrefForState(state: PageState): string {
  const params = buildSearchParams(state);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function toVals(state: PageState): Record<string, string> {
  return Object.fromEntries(buildSearchParams(state).entries());
}

function withScene(state: PageState, scene: DemoScene): PageState {
  return { ...state, scene };
}

function withAccent(state: PageState, accent: AccentName): PageState {
  return { ...state, config: { ...state.config, accent } };
}

function toggledState(state: PageState, key: ToggleKey): PageState {
  switch (key) {
    case "theme":
      return {
        ...state,
        config: {
          ...state.config,
          theme: state.config.theme === "dark" ? "light" : "dark",
        },
      };
    case "contrast":
      return {
        ...state,
        config: { ...state.config, contrast: !state.config.contrast },
      };
    case "motion":
      return {
        ...state,
        config: { ...state.config, motion: !state.config.motion },
      };
    default:
      return assertNever(key);
  }
}

function sceneMeta(scene: DemoScene): SceneMeta {
  switch (scene) {
    case "launch":
      return {
        label: "Launch Story",
        eyebrow: "Landing Composition",
        title: "Auras can look polished before you write a design system.",
        summary:
          "A hero, supporting cards, action buttons, and rhythm without utility classes or bespoke component wrappers.",
        proof: [
          "Semantic sections and articles",
          "Surface hierarchy through cards",
          "Button variants and token-driven contrast",
        ],
      };
    case "ops":
      return {
        label: "Ops View",
        eyebrow: "Dense Information",
        title: "The same primitives hold up when the UI gets busier.",
        summary:
          "Dashboards, notices, progress bars, and tables stay legible because the spacing and surface rules are already there.",
        proof: [
          "Grid and stack layouts stay readable",
          "Native progress and table elements are styled",
          "Status messaging stays semantic",
        ],
      };
    case "settings":
      return {
        label: "Settings Flow",
        eyebrow: "Native Controls",
        title: "Forms stay believable because they are real HTML controls.",
        summary:
          "Inputs, switches, validation, helper copy, and actions look cohesive without replacing the browser with custom widgets.",
        proof: [
          "Native input, select, textarea, range, and switch styling",
          "Validation through aria-invalid",
          "Soft, solid, and ghost button variants",
        ],
      };
    default:
      return assertNever(scene);
  }
}

function sceneSnippet(scene: DemoScene): string {
  switch (scene) {
    case "launch":
      return (
        `<section data-layout="grid" data-grid-min="md" data-gap="4">\n` +
        `  <article data-surface="card" data-layout="stack" data-gap="3">\n` +
        `    <p>Ship polished pages from semantic HTML.</p>\n` +
        `    <div data-layout="cluster" data-gap="2">\n` +
        `      <a role="button" data-variant="solid">Try it</a>\n` +
        `      <a role="button" data-variant="ghost">Inspect markup</a>\n` +
        `    </div>\n` +
        `  </article>\n` +
        `</section>`
      );
    case "ops":
      return (
        `<section data-layout="grid" data-grid-min="md" data-gap="4">\n` +
        `  <div data-surface="card">\n` +
        `    <progress value="82" max="100">82%</progress>\n` +
        `  </div>\n` +
        `  <aside data-surface="notice" data-status="warning">\n` +
        `    Search queue above target latency.\n` +
        `  </aside>\n` +
        `</section>`
      );
    case "settings":
      return (
        `<form data-layout="stack" data-gap="3">\n` +
        `  <label>\n` +
        `    Email\n` +
        `    <input type="email" aria-invalid="true" />\n` +
        `  </label>\n` +
        `  <button data-variant="solid">Save changes</button>\n` +
        `</form>`
      );
    default:
      return assertNever(scene);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}

// =============================================================================
// Page-specific styles
// =============================================================================

const PAGE_STYLES = `
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 5rem;
  }

  :root {
    --page-padding-block: 0;
    --container-max: 78rem;
  }

  body {
    background:
      radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 30%),
      radial-gradient(circle at 85% 18%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 36%),
      linear-gradient(180deg, color-mix(in oklch, var(--primary) 5%, var(--bg)), var(--bg) 28%);
  }

  [data-skip-link] {
    position: absolute;
    inset-block-start: -100%;
    inset-inline-start: var(--space-4);
    z-index: 100;
    padding: var(--space-2) var(--space-4);
    background: var(--primary);
    color: var(--text-on-primary);
    border-radius: var(--radius-md);
    font-weight: 700;
    text-decoration: none;
  }

  [data-skip-link]:focus-visible {
    inset-block-start: var(--space-2);
  }

  [data-site-header] {
    position: sticky;
    top: 0;
    z-index: 40;
    border-block-end: 1px solid color-mix(in oklch, var(--border) 75%, transparent);
    background: color-mix(in oklch, var(--bg) 88%, transparent);
    backdrop-filter: blur(18px);
  }

  [data-site-header] strong {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    letter-spacing: -0.04em;
  }

  [data-site-header] [data-demo-header-copy] {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  [data-demo-hero] {
    padding-block: clamp(4rem, 9vw, 7rem) var(--space-10);
  }

  [data-demo-hero-grid] {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
    gap: clamp(1.5rem, 3vw, 3rem);
    align-items: center;
  }

  [data-demo-eyebrow] {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    inline-size: fit-content;
    padding: 0.45rem 0.8rem;
    border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
    border-radius: var(--radius-full);
    background: color-mix(in oklch, var(--surface) 82%, transparent);
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  [data-demo-eyebrow] span:last-child {
    color: var(--text);
  }

  [data-demo-title] {
    font-family: var(--font-display);
    font-size: var(--text-5xl);
    line-height: 0.95;
    letter-spacing: -0.06em;
    max-inline-size: 11ch;
  }

  [data-demo-title] mark {
    padding: 0;
    background: none;
    color: var(--primary);
  }

  [data-demo-lead] {
    max-inline-size: 58ch;
    color: color-mix(in oklch, var(--text) 80%, var(--text-muted));
    font-size: var(--text-md);
    line-height: var(--leading-relaxed);
  }

  [data-demo-chip-row] {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  [data-demo-chip] {
    padding: 0.55rem 0.9rem;
    border: 1px solid color-mix(in oklch, var(--border) 78%, transparent);
    border-radius: var(--radius-full);
    background: color-mix(in oklch, var(--surface) 82%, transparent);
  }

  [data-demo-hero-window] {
    position: relative;
    overflow: hidden;
    padding: 1.1rem;
    border: 1px solid color-mix(in oklch, var(--border) 72%, transparent);
    border-radius: calc(var(--radius-lg) + 0.4rem);
    background:
      linear-gradient(180deg, color-mix(in oklch, var(--surface) 92%, transparent), color-mix(in oklch, var(--surface-raised) 85%, transparent));
    box-shadow: var(--shadow-xl);
  }

  [data-demo-hero-window]::before {
    content: "";
    position: absolute;
    inset: auto -20% 55% 35%;
    block-size: 13rem;
    background: radial-gradient(circle, color-mix(in oklch, var(--primary) 28%, transparent), transparent 70%);
    pointer-events: none;
    filter: blur(24px);
  }

  [data-demo-window-bar] {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-block-end: var(--space-4);
  }

  [data-demo-window-dot] {
    inline-size: 0.7rem;
    block-size: 0.7rem;
    border-radius: 999px;
    background: color-mix(in oklch, var(--border-strong) 45%, white);
  }

  [data-demo-window-body] {
    position: relative;
    display: grid;
    gap: var(--space-4);
  }

  [data-demo-glass] {
    padding: var(--space-6);
    border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
    border-radius: calc(var(--radius-lg) + 0.2rem);
    background: color-mix(in oklch, var(--surface) 84%, transparent);
    backdrop-filter: blur(12px);
  }

  [data-demo-mini-grid] {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  [data-demo-mini-card] {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
    background: color-mix(in oklch, var(--surface-raised) 88%, transparent);
  }

  [data-demo-mini-label] {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  [data-demo-mini-value] {
    margin-block-start: var(--space-2);
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    letter-spacing: -0.04em;
  }

  [data-demo-hero-snippet] {
    border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
    border-radius: var(--radius-lg);
    background: color-mix(in oklch, var(--surface-raised) 90%, transparent);
  }

  [data-demo-hero-snippet] pre {
    margin: 0;
  }

  [data-proof-grid] {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }

  [data-proof-card] {
    padding: var(--space-4);
    border: 1px solid color-mix(in oklch, var(--border) 78%, transparent);
    border-radius: var(--radius-lg);
    background: color-mix(in oklch, var(--surface) 88%, transparent);
    box-shadow: var(--shadow-sm);
  }

  [data-proof-card] strong {
    display: block;
    margin-block-end: var(--space-2);
    font-size: var(--text-lg);
    letter-spacing: -0.03em;
  }

  [data-proof-card] span {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  [data-demo-section-label] {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  [data-playground-section] {
    padding-block: var(--space-8);
  }

  [data-playground-grid] {
    display: grid;
    grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
  }

  [data-theme-lab] {
    position: sticky;
    top: 5.5rem;
  }

  [data-theme-lab] [data-surface="card"] {
    box-shadow: var(--shadow-md);
  }

  [data-accent-link] {
    justify-content: flex-start;
    min-inline-size: 0;
  }

  [data-accent-link] [data-accent-dot] {
    inline-size: 0.85rem;
    block-size: 0.85rem;
    border-radius: 999px;
    background: oklch(70% 0.16 var(--accent-hue));
  }

  [data-axis-row] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  [data-axis-copy] {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  [data-playground-shell] {
    border-radius: calc(var(--radius-lg) + 0.2rem);
    border: 1px solid color-mix(in oklch, var(--border) 76%, transparent);
    background: color-mix(in oklch, var(--surface) 92%, transparent);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  [data-scene-tabs] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-4);
    border-block-end: 1px solid color-mix(in oklch, var(--border) 74%, transparent);
    background: color-mix(in oklch, var(--surface-raised) 70%, transparent);
  }

  [data-scene-tab][aria-pressed="true"] {
    --button-bg: var(--primary);
    --button-color: var(--text-on-primary);
    --button-border-color: transparent;
    --button-hover-bg: var(--primary-hover);
    --button-shadow: var(--shadow-sm);
  }

  [data-playground-body] {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.9fr);
    gap: var(--space-4);
    padding: var(--space-4);
  }

  [data-scene-panel] {
    min-block-size: 33rem;
    padding: var(--space-5);
    border-radius: calc(var(--radius-lg) + 0.1rem);
    border: 1px solid color-mix(in oklch, var(--border) 72%, transparent);
    background:
      radial-gradient(circle at top right, color-mix(in oklch, var(--primary) 10%, transparent), transparent 32%),
      color-mix(in oklch, var(--surface) 92%, transparent);
  }

  [data-scene-panel] > * {
    min-inline-size: 0;
  }

  [data-scene-heading] {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    letter-spacing: -0.04em;
  }

  [data-scene-summary] {
    color: var(--text-muted);
  }

  [data-scene-metrics] {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  [data-scene-metric] {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in oklch, var(--border) 76%, transparent);
    background: color-mix(in oklch, var(--surface-raised) 88%, transparent);
  }

  [data-scene-metric] strong {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    letter-spacing: -0.04em;
  }

  [data-scene-metric] span {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  [data-launch-feature-grid] {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  [data-launch-feature] {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in oklch, var(--border) 78%, transparent);
    background: color-mix(in oklch, var(--surface) 85%, transparent);
  }

  [data-launch-feature] strong,
  [data-ops-card] strong,
  [data-settings-note] strong {
    display: block;
    margin-block-end: var(--space-2);
  }

  [data-ops-grid] {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  [data-ops-card] {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in oklch, var(--border) 76%, transparent);
    background: color-mix(in oklch, var(--surface-raised) 88%, transparent);
  }

  [data-ops-stat] {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    letter-spacing: -0.04em;
  }

  [data-settings-grid] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 15rem;
    gap: var(--space-4);
    align-items: start;
  }

  [data-settings-note] {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in oklch, var(--border) 76%, transparent);
    background: color-mix(in oklch, var(--surface-raised) 90%, transparent);
  }

  [data-code-panel] {
    display: grid;
    gap: var(--space-4);
    align-content: start;
  }

  [data-code-panel] [data-surface="card"] {
    box-shadow: var(--shadow-sm);
  }

  [data-code-panel] pre {
    margin: 0;
    overflow-x: auto;
  }

  [data-proof-list] {
    color: var(--text-muted);
    padding-inline-start: 1.25rem;
  }

  [data-reference-grid] {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
  }

  [data-reference-grid] [data-surface="card"] {
    box-shadow: var(--shadow-sm);
  }

  [data-reference-grid] pre {
    margin: 0;
  }

  footer {
    padding-block: var(--space-10);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  @keyframes demo-float {
    from { transform: translateY(0); }
    to { transform: translateY(-0.35rem); }
  }

  [data-demo-hero-window] {
    animation: demo-float 4s ease-in-out infinite alternate;
  }

  [data-motion="reduce"] [data-demo-hero-window] {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    :root:not([data-motion]) [data-demo-hero-window] {
      animation: none;
    }
  }

  @media (max-width: 960px) {
    [data-demo-hero-grid],
    [data-playground-grid],
    [data-playground-body],
    [data-settings-grid] {
      grid-template-columns: 1fr;
    }

    [data-theme-lab] {
      position: static;
    }
  }

  @media (max-width: 720px) {
    [data-proof-grid],
    [data-reference-grid],
    [data-ops-grid],
    [data-scene-metrics],
    [data-demo-mini-grid],
    [data-launch-feature-grid] {
      grid-template-columns: 1fr;
    }

    [data-demo-title] {
      max-inline-size: 12ch;
    }

    [data-site-header] [data-layout~="row"] {
      align-items: flex-start;
    }
  }
`;

// =============================================================================
// Static components
// =============================================================================

function SiteHeader(props: { state: PageState }) {
  const { state } = props;
  return (
    <header data-site-header>
      <div
        data-layout="container row"
        data-align="center"
        data-justify="between"
        data-gap="4"
      >
        <div data-layout="stack" data-gap="1">
          <strong>Auras + HSX</strong>
          <span data-demo-header-copy>
            semantic HTML, typed fragments, and one optional stylesheet
          </span>
        </div>

        <nav data-nav="inline" aria-label="Showcase sections">
          <ul>
            <li><a href="#playground">Playground</a></li>
            <li><a href="#reference">Reference</a></li>
            <li><a href={hrefForState(toggledState(state, "theme"))}>
              {state.config.theme === "dark" ? "Light mode" : "Dark mode"}
            </a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section data-demo-hero>
      <div data-layout="container stack" data-gap="8">
        <div data-demo-hero-grid>
          <div data-layout="stack" data-gap="5">
            <div data-demo-eyebrow>
              <span>First impression demo</span>
              <span>semantic HTML that already feels designed</span>
            </div>

            <div data-layout="stack" data-gap="4">
              <h1 data-demo-title>
                Build <mark>clean markup</mark> that still looks like a product.
              </h1>
              <p data-demo-lead>
                This redesign treats Auras as a design surface instead of a
                style checklist. The page leads with atmosphere, proves the
                primitives in real scenes, and shows how HSX swaps those scenes
                through server-rendered fragments.
              </p>
            </div>

            <div data-layout="cluster" data-gap="2">
              <a href="#playground" role="button" data-variant="solid">
                Open the playground
              </a>
              <a href="#reference" role="button" data-variant="ghost">
                See semantic recipes
              </a>
            </div>

            <div data-layout="cluster" data-gap="2" data-demo-chip-row>
              <span data-demo-chip>0 utility classes</span>
              <span data-demo-chip>1 stylesheet</span>
              <span data-demo-chip>3 server-rendered scenes</span>
              <span data-demo-chip>native forms, data, and prose</span>
            </div>
          </div>

          <HeroWindow />
        </div>

        <div data-proof-grid>
          <article data-proof-card>
            <strong>Semantic first</strong>
            <span>Real sections, articles, forms, notices, tables, and progress.</span>
          </article>
          <article data-proof-card>
            <strong>HSX in the loop</strong>
            <span>Scene tabs swap fragments from a typed route instead of client state.</span>
          </article>
          <article data-proof-card>
            <strong>Token-driven styling</strong>
            <span>Accent hue, theme, contrast, and motion all flow from a small state object.</span>
          </article>
          <article data-proof-card>
            <strong>Compact reference</strong>
            <span>The lower section still explains the system without turning the landing area into docs.</span>
          </article>
        </div>
      </div>
    </section>
  );
}

function HeroWindow() {
  return (
    <div data-demo-hero-window>
      <div data-demo-window-bar aria-hidden="true">
        <span data-demo-window-dot />
        <span data-demo-window-dot />
        <span data-demo-window-dot />
      </div>

      <div data-demo-window-body>
        <div data-demo-glass data-layout="stack" data-gap="4">
          <div data-layout="cluster" data-gap="2">
            <span data-demo-chip>semantic sections</span>
            <span data-demo-chip>cards + notices</span>
            <span data-demo-chip>theme axes</span>
          </div>

          <div data-layout="stack" data-gap="3">
            <div data-demo-section-label>Launch-ready shell</div>
            <h2 data-scene-heading>
              Present a product page and its settings UI with the same primitives.
            </h2>
            <p data-scene-summary>
              Hero rhythm, metric cards, supporting surfaces, and inline code
              can share one token system without hiding the HTML.
            </p>
          </div>

          <div data-demo-mini-grid>
            <div data-demo-mini-card>
              <div data-demo-mini-label>Setup</div>
              <div data-demo-mini-value>1 link tag</div>
            </div>
            <div data-demo-mini-card>
              <div data-demo-mini-label>Controls</div>
              <div data-demo-mini-value>native only</div>
            </div>
            <div data-demo-mini-card>
              <div data-demo-mini-label>Theme</div>
              <div data-demo-mini-value>URL-backed</div>
            </div>
          </div>
        </div>

        <div data-demo-hero-snippet>
          <pre><code>{`<main data-layout="container stack" data-gap="8">\n  <section data-layout="grid" data-grid-min="md">\n    <article data-surface="card">...</article>\n  </section>\n</main>`}</code></pre>
        </div>
      </div>
    </div>
  );
}

function ThemeLab(props: { state: PageState }) {
  const { state } = props;
  return (
    <aside data-theme-lab data-layout="stack" data-gap="4">
      <div data-surface="card" data-layout="stack" data-gap="4">
        <div data-layout="stack" data-gap="2">
          <div data-demo-section-label>Theme Lab</div>
          <h2>Shareable URL state</h2>
          <p>
            These controls reload the page so theme axes stay visible and
            copyable. The scene state is preserved while you switch them.
          </p>
        </div>

        <div data-layout="stack" data-gap="2">
          {(Object.entries(ACCENTS) as Array<[AccentName, AccentTokens]>).map(
            ([name, tokens]) => (
              <a
                href={hrefForState(withAccent(state, name))}
                role="button"
                data-variant={state.config.accent === name ? "solid" : "soft"}
                data-accent-link
                style={{ "--accent-hue": tokens.hue }}
              >
                <span data-accent-dot />
                {tokens.label}
              </a>
            ),
          )}
        </div>
      </div>

      <div data-surface="card" data-layout="stack" data-gap="4">
        <div data-axis-row>
          <div data-layout="stack" data-gap="1">
            <strong>Dark theme</strong>
            <span data-axis-copy>Swap the full document theme token set.</span>
          </div>
          <a
            href={hrefForState(toggledState(state, "theme"))}
            role="button"
            data-variant={state.config.theme === "dark" ? "solid" : "soft"}
          >
            {state.config.theme === "dark" ? "On" : "Off"}
          </a>
        </div>

        <div data-axis-row>
          <div data-layout="stack" data-gap="1">
            <strong>Higher contrast</strong>
            <span data-axis-copy>Strengthen borders and secondary text contrast.</span>
          </div>
          <a
            href={hrefForState(toggledState(state, "contrast"))}
            role="button"
            data-variant={state.config.contrast ? "solid" : "soft"}
          >
            {state.config.contrast ? "On" : "Off"}
          </a>
        </div>

        <div data-axis-row>
          <div data-layout="stack" data-gap="1">
            <strong>Reduced motion</strong>
            <span data-axis-copy>Disable showcase-only motion while keeping the layout intact.</span>
          </div>
          <a
            href={hrefForState(toggledState(state, "motion"))}
            role="button"
            data-variant={state.config.motion ? "solid" : "soft"}
          >
            {state.config.motion ? "On" : "Off"}
          </a>
        </div>
      </div>
    </aside>
  );
}

function LaunchScene() {
  return (
    <article data-layout="stack" data-gap="5">
      <div data-layout="stack" data-gap="3">
        <div data-demo-section-label>Marketing layout</div>
        <h3 data-scene-heading>Ship a polished launch page from semantic building blocks.</h3>
        <p data-scene-summary>
          Use cards for containment, cluster and grid for rhythm, and button
          variants for action hierarchy. Nothing here depends on utilities.
        </p>
      </div>

      <div data-scene-metrics>
        <div data-scene-metric>
          <strong>4.7x</strong>
          <span>faster mockup iteration</span>
        </div>
        <div data-scene-metric>
          <strong>12 blocks</strong>
          <span>from hero to detail grid</span>
        </div>
        <div data-scene-metric>
          <strong>0 wrappers</strong>
          <span>added just for styling</span>
        </div>
      </div>

      <div data-launch-feature-grid>
        <div data-launch-feature>
          <strong>Surface hierarchy</strong>
          <p>
            Cards establish depth and grouping without introducing a component
            taxonomy first.
          </p>
        </div>
        <div data-launch-feature>
          <strong>Action rhythm</strong>
          <p>
            Solid, soft, and ghost buttons give obvious priority without a design
            token ceremony.
          </p>
        </div>
      </div>

      <div data-layout="cluster" data-gap="2">
        <a href="#reference" role="button" data-variant="solid">Inspect patterns</a>
        <a href="#playground" role="button" data-variant="ghost">Stay in semantic HTML</a>
      </div>
    </article>
  );
}

function OpsScene() {
  return (
    <article data-layout="stack" data-gap="4">
      <div data-layout="stack" data-gap="3">
        <div data-demo-section-label>Operational dashboard</div>
        <h3 data-scene-heading>Dense screens still read cleanly.</h3>
        <p data-scene-summary>
          The same tokens keep metrics, warnings, and tabular data calm enough
          to scan without flattening everything into gray boxes.
        </p>
      </div>

      <div data-ops-grid>
        <div data-ops-card>
          <strong>Deploy health</strong>
          <div data-ops-stat>82%</div>
        </div>
        <div data-ops-card>
          <strong>Median latency</strong>
          <div data-ops-stat>148ms</div>
        </div>
        <div data-ops-card>
          <strong>Queue depth</strong>
          <div data-ops-stat>37</div>
        </div>
      </div>

      <div data-surface="notice" data-status="warning">
        <strong>Search queue running above target.</strong>
        <p>Traffic is healthy, but the indexing worker is now the bottleneck.</p>
      </div>

      <div data-layout="stack" data-gap="3">
        <div>
          <label htmlFor="ops-progress">Migration progress</label>
          <progress id="ops-progress" value={82} max={100}>82%</progress>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>API gateway</td><td>Healthy</td><td>18 ms</td></tr>
              <tr><td>Search worker</td><td>Watch</td><td>341 ms</td></tr>
              <tr><td>Notifications</td><td>Healthy</td><td>26 ms</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}

function SettingsScene() {
  return (
    <article data-layout="stack" data-gap="4">
      <div data-layout="stack" data-gap="3">
        <div data-demo-section-label>Settings interface</div>
        <h3 data-scene-heading>Native controls stay cohesive.</h3>
        <p data-scene-summary>
          The form relies on browser controls, with Auras only providing rhythm,
          tokens, and validation styling.
        </p>
      </div>

      <div data-settings-grid>
        <form data-layout="stack" data-gap="3">
          <div>
            <label htmlFor="settings-name">Workspace name</label>
            <input id="settings-name" type="text" value="Northwind Studio" />
          </div>

          <div>
            <label htmlFor="settings-email">Billing email</label>
            <input
              id="settings-email"
              type="email"
              value="team@northwind"
              aria-invalid="true"
            />
          </div>

          <div>
            <label htmlFor="settings-plan">Plan</label>
            <select id="settings-plan">
              <option>Starter</option>
              <option selected>Scale</option>
              <option>Enterprise</option>
            </select>
          </div>

          <label data-layout="row" data-align="center" data-gap="2">
            <input type="checkbox" role="switch" checked />
            Enable weekly performance digest
          </label>

          <div>
            <label htmlFor="settings-confidence">Launch confidence</label>
            <input id="settings-confidence" type="range" min={0} max={100} value={74} />
          </div>

          <div data-layout="cluster" data-gap="2">
            <button type="button" data-variant="solid">Save changes</button>
            <button type="button" data-variant="soft">Preview email</button>
            <button type="button" data-variant="ghost">Cancel</button>
          </div>
        </form>

        <aside data-settings-note>
          <strong>Why this matters</strong>
          <p>
            If the default form states already look trustworthy, teams can keep
            custom UI work for places where it actually buys something.
          </p>
        </aside>
      </div>
    </article>
  );
}

function renderScene(scene: DemoScene) {
  switch (scene) {
    case "launch":
      return <LaunchScene />;
    case "ops":
      return <OpsScene />;
    case "settings":
      return <SettingsScene />;
    default:
      return assertNever(scene);
  }
}

function PlaygroundShell(state: PageState) {
  const meta = sceneMeta(state.scene);

  return (
    <div id="playground-shell" data-playground-shell>
      <div data-scene-tabs role="tablist" aria-label="Preview scenes">
        {(["launch", "ops", "settings"] as const).map((scene) => (
          <button
            type="button"
            data-scene-tab
            data-variant="ghost"
            get={Playground}
            vals={toVals(withScene(state, scene))}
            target={ids.playground}
            swap="outerHTML"
            aria-pressed={state.scene === scene ? "true" : "false"}
          >
            {sceneMeta(scene).label}
          </button>
        ))}
      </div>

      <div data-playground-body>
        <section data-scene-panel data-layout="stack" data-gap="4" aria-live="polite">
          {renderScene(state.scene)}
        </section>

        <aside data-code-panel>
          <div data-surface="card" data-layout="stack" data-gap="3">
            <div data-demo-section-label>{meta.eyebrow}</div>
            <h3>{meta.title}</h3>
            <p>{meta.summary}</p>
          </div>

          <div data-surface="card" data-layout="stack" data-gap="3">
            <div data-demo-section-label>What This Proves</div>
            <ul data-proof-list>
              {meta.proof.map((item) => <li>{item}</li>)}
            </ul>
          </div>

          <div data-surface="card" data-layout="stack" data-gap="3">
            <div data-demo-section-label>Matching Markup</div>
            <pre><code>{sceneSnippet(state.scene)}</code></pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Playground = hsxComponent("/playground", {
  handler(req) {
    return parseState(new URL(req.url));
  },

  render(state) {
    return <PlaygroundShell {...state} />;
  },
});

function PlaygroundSection(props: { state: PageState }) {
  const { state } = props;

  return (
    <section id="playground" data-playground-section>
      <div data-layout="container stack" data-gap="6">
        <div data-ui="prose">
          <div data-demo-section-label>Hybrid Demo</div>
          <h2>One page, two jobs.</h2>
          <p>
            The top of this page sells the visual idea. This middle section
            proves the implementation shape. Theme controls use URL-backed
            full-page state. Scene tabs use an HSX route and HTMX swap to
            replace just the preview shell.
          </p>
        </div>

        <div data-playground-grid>
          <ThemeLab state={state} />
          <Playground.Component {...state} />
        </div>
      </div>
    </section>
  );
}

function ReferenceSection() {
  return (
    <section id="reference" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-demo-section-label>Quick Reference</div>
        <h2>Keep the useful parts of a showcase close at hand.</h2>
        <p>
          The old page was mostly this. The reference is still here, but it now
          supports the demo instead of replacing it.
        </p>
      </div>

      <div data-reference-grid>
        {REFERENCE_CARDS.map((card) => (
          <article data-surface="card" data-layout="stack" data-gap="3">
            <div data-demo-section-label>{card.label}</div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <pre><code>{card.snippet}</code></pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer>
      <div
        data-layout="container row"
        data-align="center"
        data-justify="between"
        data-gap="4"
      >
        <span>Built with HSX and Auras.</span>
        <nav data-nav="inline" aria-label="Footer links">
          <ul>
            <li><a href="#playground">Back to playground</a></li>
            <li><a href="#top">Back to top</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

// =============================================================================
// Page cache
// =============================================================================

const pageCache = new Map<string, ReturnType<typeof hsxPage>>();

function getPage(state: PageState) {
  const key = [
    state.config.theme,
    state.config.accent,
    state.config.contrast ? "contrast" : "normal",
    state.config.motion ? "reduce" : "motion",
    state.scene,
  ].join(":");

  const cached = pageCache.get(key);
  if (cached) return cached;

  const htmlAttrs: Record<string, unknown> = { lang: "en", id: "top" };
  if (state.config.theme === "dark") htmlAttrs["data-theme"] = "dark";
  if (state.config.contrast) htmlAttrs["data-contrast"] = "more";
  if (state.config.motion) htmlAttrs["data-motion"] = "reduce";

  const page = hsxPage(() => (
    <html {...htmlAttrs}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Auras Showcase | First-impression demo for semantic HTML</title>
        <meta
          name="description"
          content="A redesigned Auras showcase for first-time users: polished landing composition, live HSX scene switching, and a compact semantic reference."
        />
        <link rel="stylesheet" href={HSX_STYLES_PATH} />
        <style>
          {state.config.accent !== "indigo"
            ? `:root { --hue-primary: ${ACCENTS[state.config.accent].hue}; }\n`
            : ""}
          {PAGE_STYLES}
        </style>
      </head>
      <body>
        <a href="#main" data-skip-link>Skip to main content</a>
        <SiteHeader state={state} />
        <Hero />
        <main id="main" data-layout="stack" data-gap="10">
          <PlaygroundSection state={state} />
          <ReferenceSection />
        </main>
        <SiteFooter />
      </body>
    </html>
  ), { validateOnce: true });

  pageCache.set(key, page);
  return page;
}

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: {
        "content-type": "text/css; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response("// htmx.js not found", {
        status: 500,
        headers: { "content-type": "text/javascript" },
      });
    }
  }

  if (pathname === Playground.path) {
    return Playground.handle(req);
  }

  if (pathname === "/") {
    return getPage(parseState(url)).render();
  }

  return new Response("Not found", { status: 404 });
});
