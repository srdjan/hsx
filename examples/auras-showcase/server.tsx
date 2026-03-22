import { hsxPage } from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";

// =============================================================================
// Types
// =============================================================================

type AccentName = "indigo" | "emerald" | "amber" | "rose";

type PageConfig = {
  readonly theme: "light" | "dark";
  readonly accent: AccentName;
  readonly contrast: boolean;
  readonly motion: boolean;
};

type AccentTokens = {
  readonly hue: string;
  readonly label: string;
};

const ACCENTS: Readonly<Record<AccentName, AccentTokens>> = {
  indigo: { hue: "266", label: "Indigo" },
  emerald: { hue: "160", label: "Emerald" },
  amber: { hue: "80", label: "Amber" },
  rose: { hue: "350", label: "Rose" },
};

// =============================================================================
// Config Parsing
// =============================================================================

function parseConfig(url: URL): PageConfig {
  const accent = url.searchParams.get("accent");
  return {
    theme: url.searchParams.get("theme") === "dark" ? "dark" : "light",
    accent:
      accent === "emerald" || accent === "amber" || accent === "rose"
        ? accent
        : "indigo",
    contrast: url.searchParams.get("contrast") === "more",
    motion: url.searchParams.get("motion") === "reduce",
  };
}

function configToParams(config: PageConfig): string {
  const params = new URLSearchParams();
  if (config.theme === "dark") params.set("theme", "dark");
  if (config.accent !== "indigo") params.set("accent", config.accent);
  if (config.contrast) params.set("contrast", "more");
  if (config.motion) params.set("motion", "reduce");
  const str = params.toString();
  return str ? `?${str}` : "";
}

function toggleParam(config: PageConfig, key: string): string {
  const next = { ...config };
  if (key === "theme") {
    (next as Record<string, unknown>).theme =
      config.theme === "dark" ? "light" : "dark";
  } else if (key === "contrast") {
    (next as Record<string, unknown>).contrast = !config.contrast;
  } else if (key === "motion") {
    (next as Record<string, unknown>).motion = !config.motion;
  }
  return `/${configToParams(next)}`;
}

function accentUrl(config: PageConfig, accent: AccentName): string {
  return `/${configToParams({ ...config, accent })}`;
}

// =============================================================================
// Minimal Page-Specific Styles (no class selectors)
// =============================================================================

const PAGE_STYLES = `
  html { scroll-behavior: smooth; scroll-padding-top: 4.5rem; }
  :root { --page-padding-block: 0; }

  [data-skip-link] {
    position: absolute;
    inset-block-start: -100%;
    inset-inline-start: var(--space-4);
    z-index: 100;
    padding: var(--space-2) var(--space-4);
    background: var(--primary);
    color: var(--text-on-primary);
    border-radius: var(--radius-md);
    font-weight: 600;
    text-decoration: none;
  }
  [data-skip-link]:focus-visible {
    inset-block-start: var(--space-2);
  }

  [data-site-header] {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in oklch, var(--bg) 92%, transparent);
    backdrop-filter: blur(12px);
    border-block-end: 1px solid var(--border);
    padding: var(--space-3) var(--space-4);
  }

  [data-hero] {
    padding-block: var(--space-16) var(--space-12);
    text-align: center;
    background:
      radial-gradient(ellipse at 50% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%),
      var(--bg);
  }
  [data-hero] h1 { font-size: var(--text-3xl); letter-spacing: -0.03em; }
  [data-hero] p  { max-inline-size: 48ch; margin-inline: auto; }

  [data-section-label] {
    color: var(--text-muted);
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
  }

  main { padding-block: var(--space-8); }
  footer { padding-block: var(--space-8); color: var(--text-muted); font-size: var(--text-sm); }

  [data-color-dot] {
    display: inline-block;
    inline-size: 0.75rem;
    block-size: 0.75rem;
    border-radius: var(--radius-full);
    vertical-align: middle;
  }
`;

// =============================================================================
// Sections
// =============================================================================

function SiteHeader(props: { config: PageConfig }) {
  const { config } = props;
  return (
    <header data-site-header>
      <div
        data-layout="container row"
        data-align="center"
        data-justify="between"
        data-gap="4"
      >
        <strong>Auras</strong>
        <nav data-nav="inline" aria-label="Page sections">
          <ul>
            <li><a href="#layout">Layout</a></li>
            <li><a href="#surfaces">Surfaces</a></li>
            <li><a href="#typography">Type</a></li>
            <li><a href="#forms">Forms</a></li>
            <li><a href="#data">Data</a></li>
            <li><a href="#theming">Theme</a></li>
          </ul>
        </nav>
        <a
          href={toggleParam(config, "theme")}
          role="button"
          data-variant="ghost"
          aria-label={
            config.theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {config.theme === "dark" ? "Light" : "Dark"}
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section data-hero>
      <div data-layout="container stack" data-gap="4" data-align="center">
        <h1>Auras</h1>
        <p>
          Zero-class styling for semantic HTML. Layout, surfaces, and theming
          through <code>data-*</code> attributes and CSS custom properties.
        </p>
        <div data-layout="cluster" data-gap="2" data-justify="center">
          <a href="#layout" role="button" data-variant="solid">
            Explore features
          </a>
          <a
            href="https://github.com/user/hsx"
            role="button"
            data-variant="ghost"
          >
            View source
          </a>
        </div>
      </div>
    </section>
  );
}

function LayoutSection() {
  return (
    <section id="layout" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Layout</div>
        <h2>Attribute-driven layout</h2>
        <p>
          Flexbox and grid layouts via <code>data-layout</code>,
          spacing via <code>data-gap</code>, alignment
          via <code>data-align</code> and <code>data-justify</code>.
          No utility classes needed.
        </p>
      </div>

      <div data-layout="grid" data-grid-min="md" data-gap="4">
        <div data-surface="card" data-layout="stack" data-gap="3">
          <h3>Grid</h3>
          <div data-layout="grid" data-grid-min="sm" data-gap="2">
            <div data-surface="card">A</div>
            <div data-surface="card">B</div>
            <div data-surface="card">C</div>
          </div>
          <pre><code>{`<div data-layout="grid" data-grid-min="sm">\n  <div data-surface="card">...</div>\n</div>`}</code></pre>
        </div>

        <div data-surface="card" data-layout="stack" data-gap="3">
          <h3>Cluster</h3>
          <div data-layout="cluster" data-gap="2">
            <span data-surface="card">Tag</span>
            <span data-surface="card">Label</span>
            <span data-surface="card">Badge</span>
            <span data-surface="card">Chip</span>
            <span data-surface="card">Token</span>
          </div>
          <pre><code>{`<div data-layout="cluster" data-gap="2">\n  <span data-surface="card">...</span>\n</div>`}</code></pre>
        </div>

        <div data-surface="card" data-layout="stack" data-gap="3">
          <h3>Stack</h3>
          <div data-layout="stack" data-gap="2">
            <div data-surface="card">First</div>
            <div data-surface="card">Second</div>
            <div data-surface="card">Third</div>
          </div>
          <pre><code>{`<div data-layout="stack" data-gap="2">\n  <div data-surface="card">...</div>\n</div>`}</code></pre>
        </div>
      </div>
    </section>
  );
}

function SurfacesSection() {
  return (
    <section id="surfaces" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Surfaces</div>
        <h2>Cards and notices</h2>
        <p>
          Surfaces define visual containment. Cards hold content,
          notices communicate status. Both respond to theme changes
          automatically.
        </p>
      </div>

      <div data-layout="grid" data-grid-min="md" data-gap="4">
        <div data-surface="card" data-layout="stack" data-gap="3">
          <h3>Standard card</h3>
          <p>A contained surface with padding, border, and radius.</p>
        </div>
        <div data-surface="card" data-interactive data-layout="stack" data-gap="3">
          <h3>Interactive card</h3>
          <p>Hover to see the elevated shadow effect.</p>
        </div>
      </div>

      <div data-layout="stack" data-gap="3">
        <div data-surface="notice" data-status="info">
          <strong>Info</strong>
          <p>The deployment pipeline completed all 24 checks.</p>
        </div>
        <div data-surface="notice" data-status="success">
          <strong>Success</strong>
          <p>User account verified and access granted.</p>
        </div>
        <div data-surface="notice" data-status="warning">
          <strong>Warning</strong>
          <p>API rate limit at 85% - consider upgrading your plan.</p>
        </div>
        <div data-surface="notice" data-status="error">
          <strong>Error</strong>
          <p>Build failed on commit <code>a3f8c21</code>. Check logs.</p>
        </div>
      </div>
    </section>
  );
}

function TypographySection() {
  return (
    <section id="typography" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Typography</div>
        <h2>Prose rendering</h2>
        <p>
          Wrap text content in <code>data-ui="prose"</code> for
          readable measure, proper spacing, and styled inline elements.
        </p>

        <h3>Inline elements</h3>
        <p>
          Text can be <strong>bold</strong>, <em>italic</em>,
          contain <code>inline code</code>,
          or <mark>highlighted</mark> passages. Links like{" "}
          <a href="#typography">this one</a> get underlines and
          transition on hover.
        </p>

        <blockquote>
          <p>
            Good design is as little design as possible. Less, but
            better, because it concentrates on the essential aspects.
          </p>
        </blockquote>

        <h3>Code blocks</h3>
        <pre><code>{`const page = hsxPage(() => (\n  <html lang="en">\n    <body>\n      <main data-layout="container stack">\n        <h1>Hello Auras</h1>\n      </main>\n    </body>\n  </html>\n));`}</code></pre>

        <h3>Lists</h3>
        <ul>
          <li>Semantic HTML elements styled by default</li>
          <li>No classes required for basic typography</li>
          <li>Readable line lengths via <code>--prose-measure</code></li>
        </ul>

        <ol>
          <li>Define your tokens in <code>:root</code></li>
          <li>Use <code>data-*</code> attributes for layout</li>
          <li>Override with custom properties as needed</li>
        </ol>
      </div>
    </section>
  );
}

function FormsSection() {
  return (
    <section id="forms" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Forms</div>
        <h2>Native form controls</h2>
        <p>
          Inputs, selects, and buttons are styled with no markup
          beyond standard HTML. Validation states use{" "}
          <code>aria-invalid</code>.
        </p>
      </div>

      <div data-layout="grid" data-grid-min="md" data-gap="4">
        <div data-surface="card" data-layout="stack" data-gap="4">
          <h3>Text inputs</h3>
          <div data-layout="stack" data-gap="3">
            <div>
              <label htmlFor="demo-name">Full name</label>
              <input id="demo-name" type="text" placeholder="Jane Smith" />
            </div>
            <div>
              <label htmlFor="demo-email">Email address</label>
              <input
                id="demo-email"
                type="email"
                value="invalid-email"
                aria-invalid="true"
              />
            </div>
            <div>
              <label htmlFor="demo-plan">Plan</label>
              <select id="demo-plan">
                <option>Starter</option>
                <option selected>Team</option>
                <option>Enterprise</option>
              </select>
            </div>
            <div>
              <label htmlFor="demo-bio">Bio</label>
              <textarea id="demo-bio" rows={3} placeholder="Tell us about yourself..." />
            </div>
          </div>
        </div>

        <div data-surface="card" data-layout="stack" data-gap="4">
          <h3>Controls</h3>
          <div data-layout="stack" data-gap="3">
            <fieldset>
              <legend>Notification preference</legend>
              <div data-layout="stack" data-gap="2">
                <label data-layout="row" data-align="center" data-gap="2">
                  <input type="radio" name="notify" value="all" checked />
                  All notifications
                </label>
                <label data-layout="row" data-align="center" data-gap="2">
                  <input type="radio" name="notify" value="important" />
                  Important only
                </label>
                <label data-layout="row" data-align="center" data-gap="2">
                  <input type="radio" name="notify" value="none" />
                  None
                </label>
              </div>
            </fieldset>

            <label data-layout="row" data-align="center" data-gap="2">
              <input type="checkbox" role="switch" checked />
              Enable dark mode sync
            </label>

            <div>
              <label htmlFor="demo-range">Confidence</label>
              <input id="demo-range" type="range" min={0} max={100} value={72} />
            </div>
          </div>

          <div data-layout="cluster" data-gap="2">
            <button type="button" data-variant="solid">Save</button>
            <button type="button" data-variant="soft">Draft</button>
            <button type="button" data-variant="ghost">Cancel</button>
            <button type="button" disabled>Disabled</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DataSection() {
  return (
    <section id="data" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Data display</div>
        <h2>Progress, meters, and tables</h2>
        <p>
          Native HTML elements for data visualization, styled
          through CSS custom properties with no JavaScript required.
        </p>
      </div>

      <div data-layout="grid" data-grid-min="md" data-gap="4">
        <div data-surface="card" data-layout="stack" data-gap="4">
          <h3>Gauges</h3>
          <div data-layout="stack" data-gap="3">
            <div>
              <label htmlFor="demo-progress">Migration progress</label>
              <progress id="demo-progress" value={68} max={100}>68%</progress>
            </div>
            <div>
              <label htmlFor="demo-meter">System health</label>
              <meter
                id="demo-meter"
                min={0}
                max={100}
                low={25}
                high={75}
                optimum={100}
                value={84}
              >
                84/100
              </meter>
            </div>
          </div>
        </div>

        <div data-surface="card" data-layout="stack" data-gap="3">
          <h3>Table</h3>
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
                <tr><td>API Gateway</td><td>Healthy</td><td>12 ms</td></tr>
                <tr><td>Auth Service</td><td>Healthy</td><td>8 ms</td></tr>
                <tr><td>Search Index</td><td>Degraded</td><td>340 ms</td></tr>
                <tr><td>CDN Edge</td><td>Healthy</td><td>3 ms</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThemingSection(props: { config: PageConfig }) {
  const { config } = props;
  return (
    <section id="theming" data-layout="container stack" data-gap="6">
      <div data-ui="prose">
        <div data-section-label>Theming</div>
        <h2>Live theme controls</h2>
        <p>
          Change the accent color, toggle dark mode, adjust contrast,
          or reduce motion. Each link reloads this page with different
          attributes on <code>&lt;html&gt;</code>.
        </p>
      </div>

      <div data-layout="grid" data-grid-min="md" data-gap="4">
        <div data-surface="card" data-layout="stack" data-gap="4">
          <h3>Accent color</h3>
          <div data-layout="cluster" data-gap="2">
            {(Object.entries(ACCENTS) as Array<[AccentName, AccentTokens]>).map(
              ([name, tokens]) => (
                <a
                  href={accentUrl(config, name)}
                  role="button"
                  data-variant={name === config.accent ? "solid" : "soft"}
                  style={
                    name !== config.accent
                      ? undefined
                      : { "--hue-primary": tokens.hue }
                  }
                >
                  {tokens.label}
                </a>
              ),
            )}
          </div>
          <p>
            Current: <code>--hue-primary: {ACCENTS[config.accent].hue}</code>
          </p>
        </div>

        <div data-surface="card" data-layout="stack" data-gap="4">
          <h3>Accessibility axes</h3>
          <div data-layout="stack" data-gap="2">
            <div data-layout="row" data-align="center" data-justify="between">
              <span>Dark mode</span>
              <a
                href={toggleParam(config, "theme")}
                role="button"
                data-variant={config.theme === "dark" ? "solid" : "soft"}
              >
                {config.theme === "dark" ? "On" : "Off"}
              </a>
            </div>
            <div data-layout="row" data-align="center" data-justify="between">
              <span>High contrast</span>
              <a
                href={toggleParam(config, "contrast")}
                role="button"
                data-variant={config.contrast ? "solid" : "soft"}
              >
                {config.contrast ? "On" : "Off"}
              </a>
            </div>
            <div data-layout="row" data-align="center" data-justify="between">
              <span>Reduced motion</span>
              <a
                href={toggleParam(config, "motion")}
                role="button"
                data-variant={config.motion ? "solid" : "soft"}
              >
                {config.motion ? "On" : "Off"}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div data-surface="card" data-layout="stack" data-gap="3">
        <h3>How it works</h3>
        <pre><code>{`<!-- Theme via data attributes on <html> -->\n<html\n  data-theme="dark"\n  data-contrast="more"\n  data-motion="reduce"\n>\n\n<!-- Accent via CSS custom property -->\n<style>:root { --hue-primary: 160; }</style>`}</code></pre>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer
      data-layout="container row"
      data-align="center"
      data-justify="between"
      data-gap="4"
    >
      <span>Built with HSX + Auras</span>
      <nav data-nav="inline" aria-label="Footer links">
        <ul>
          <li><a href="https://github.com/user/hsx">GitHub</a></li>
          <li><a href="#top">Back to top</a></li>
        </ul>
      </nav>
    </footer>
  );
}

// =============================================================================
// Page
// =============================================================================

function buildPage(config: PageConfig) {
  const htmlAttrs: Record<string, unknown> = { lang: "en", id: "top" };
  if (config.theme === "dark") htmlAttrs["data-theme"] = "dark";
  if (config.contrast) htmlAttrs["data-contrast"] = "more";
  if (config.motion) htmlAttrs["data-motion"] = "reduce";

  return hsxPage(() => (
    <html {...htmlAttrs}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Auras - Zero-class styling for semantic HTML</title>
        <meta
          name="description"
          content="Auras is a classless CSS system for semantic HTML. Layout, surfaces, and theming through data attributes and custom properties."
        />
        <link rel="stylesheet" href={HSX_STYLES_PATH} />
        <style>
          {config.accent !== "indigo"
            ? `:root { --hue-primary: ${ACCENTS[config.accent].hue}; }\n`
            : ""}
          {PAGE_STYLES}
        </style>
      </head>
      <body>
        <a href="#main" data-skip-link>Skip to main content</a>
        <SiteHeader config={config} />
        <Hero />
        <main id="main" data-layout="stack" data-gap="12">
          <LayoutSection />
          <SurfacesSection />
          <TypographySection />
          <FormsSection />
          <DataSection />
          <ThemingSection config={config} />
        </main>
        <SiteFooter />
      </body>
    </html>
  ));
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

  if (pathname === "/") {
    const config = parseConfig(url);
    return buildPage(config).render();
  }

  return new Response("Not found", { status: 404 });
});
