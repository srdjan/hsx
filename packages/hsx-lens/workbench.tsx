/**
 * HSX Lens workbench routes.
 *
 * @module workbench
 */

import { render } from "@srdjan/hsx/core";
import { hsxStyles } from "@srdjan/hsx-styles";
import type {
  HsxInteraction,
  HsxManifest,
  HsxManifestOptions,
} from "./manifest.ts";
import { createHsxManifest } from "./manifest.ts";

// =============================================================================
// Public types
// =============================================================================

export type HsxLensOptions = HsxManifestOptions & {
  readonly basePath?: string;
};

export type HsxLens = {
  readonly manifest: HsxManifest;
  handle(req: Request): Response | null;
};

// =============================================================================
// Styling
// =============================================================================

const LENS_CSS = `
:root {
  --lens-ink: oklch(18% 0.02 250);
  --lens-muted: oklch(48% 0.03 250);
  --lens-line: oklch(87% 0.02 250);
  --lens-accent: oklch(56% 0.18 160);
  --lens-accent-2: oklch(55% 0.16 30);
  --lens-bg: oklch(97% 0.012 250);
}

[data-lens-root] {
  min-height: 100vh;
  color: var(--lens-ink);
  background:
    linear-gradient(90deg, color-mix(in oklch, var(--lens-line) 42%, transparent) 1px, transparent 1px),
    linear-gradient(180deg, color-mix(in oklch, var(--lens-line) 42%, transparent) 1px, transparent 1px),
    var(--lens-bg);
  background-size: 2.25rem 2.25rem;
}

[data-lens-shell] {
  inline-size: min(100% - 2rem, 78rem);
  margin-inline: auto;
  padding-block: clamp(1rem, 4vw, 3rem);
}

[data-lens-hero] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
  margin-block-end: 1.25rem;
}

[data-lens-kicker],
[data-lens-label] {
  color: var(--lens-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

[data-lens-hero] h1 {
  max-inline-size: 14ch;
  margin: 0.15rem 0 0;
  font-size: clamp(2.1rem, 6vw, 5.25rem);
  line-height: 0.92;
  text-wrap: balance;
}

[data-lens-actions] {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: end;
}

[data-lens-actions] a {
  min-block-size: 2.75rem;
  display: inline-flex;
  align-items: center;
  padding-inline: 1rem;
  border-radius: 999px;
  color: white;
  background: var(--lens-ink);
  text-decoration: none;
  transition-property: transform, background;
  transition-duration: 160ms;
}

[data-lens-actions] a:hover {
  background: color-mix(in oklch, var(--lens-ink) 86%, var(--lens-accent));
}

[data-lens-actions] a:active {
  transform: scale(0.97);
}

[data-lens-metrics] {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
  gap: 0.75rem;
  margin-block-end: 1.25rem;
}

[data-lens-metric] {
  padding: 1rem;
  border-radius: 0.75rem;
  background: color-mix(in oklch, white 88%, transparent);
  box-shadow: 0 1px 1px color-mix(in oklch, black 10%, transparent),
    0 12px 30px color-mix(in oklch, black 6%, transparent);
}

[data-lens-metric] strong {
  display: block;
  font-size: clamp(1.75rem, 5vw, 3rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

[data-lens-grid] {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
  gap: 1rem;
  align-items: start;
}

[data-lens-panel] {
  border-radius: 0.85rem;
  background: color-mix(in oklch, white 90%, transparent);
  box-shadow: 0 1px 1px color-mix(in oklch, black 10%, transparent),
    0 18px 45px color-mix(in oklch, black 7%, transparent);
  overflow: clip;
}

[data-lens-panel] > header {
  padding: 1rem;
  border-block-end: 1px solid var(--lens-line);
}

[data-lens-panel] h2 {
  margin: 0.15rem 0 0;
  font-size: 1rem;
}

[data-lens-list] {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

[data-lens-circuit] {
  display: grid;
  grid-template-columns: minmax(7rem, 0.75fr) auto minmax(7rem, 1fr) auto minmax(7rem, 0.75fr);
  gap: 0.55rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-block-end: 1px solid var(--lens-line);
}

[data-lens-circuit]:last-child {
  border-block-end: 0;
}

[data-lens-node] {
  min-inline-size: 0;
  padding: 0.65rem 0.7rem;
  border-radius: 0.55rem;
  background: oklch(98% 0.008 250);
}

[data-lens-node="route"] {
  background: color-mix(in oklch, var(--lens-accent) 13%, white);
}

[data-lens-node="target"] {
  background: color-mix(in oklch, var(--lens-accent-2) 12%, white);
}

[data-lens-node] strong,
[data-lens-node] code {
  display: block;
  overflow-wrap: anywhere;
}

[data-lens-arrow] {
  color: var(--lens-muted);
  font-weight: 700;
}

[data-lens-side] {
  display: grid;
  gap: 1rem;
}

[data-lens-table] {
  inline-size: 100%;
  border-collapse: collapse;
}

[data-lens-table] th,
[data-lens-table] td {
  padding: 0.65rem 1rem;
  border-block-end: 1px solid var(--lens-line);
  text-align: start;
  vertical-align: top;
}

[data-lens-table] th {
  color: var(--lens-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}

[data-lens-empty] {
  padding: 1rem;
  color: var(--lens-muted);
}

[data-lens-warning] {
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--lens-line);
}

[data-lens-warning] code {
  color: oklch(42% 0.16 30);
}

@media (max-width: 820px) {
  [data-lens-hero],
  [data-lens-grid],
  [data-lens-circuit] {
    grid-template-columns: 1fr;
  }

  [data-lens-actions] {
    justify-content: start;
  }

  [data-lens-arrow] {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-lens-actions] a {
    transition-duration: 0.01ms;
  }
}
`;

// =============================================================================
// Rendering helpers
// =============================================================================

function normalizeBasePath(basePath: string): string {
  if (!basePath.startsWith("/")) return `/${basePath}`;
  return basePath.length > 1 ? basePath.replace(/\/+$/, "") : basePath;
}

function routeLabel(interaction: HsxInteraction): string {
  return interaction.url ?? interaction.routePath ?? "(no route)";
}

function sourceLabel(interaction: HsxInteraction): string {
  const method = interaction.method ?? "HTML";
  const trigger = interaction.trigger ? ` on ${interaction.trigger}` : "";
  return `${method}${trigger}`;
}

function targetLabel(interaction: HsxInteraction): string {
  if (interaction.swapOob) return `oob ${interaction.swapOob}`;
  return interaction.target ?? interaction.select ?? "(self/default)";
}

function WorkbenchPage(
  { manifest, basePath }: { manifest: HsxManifest; basePath: string },
) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{manifest.appName} - HSX Lens</title>
        <style>{hsxStyles}</style>
        <style>{LENS_CSS}</style>
      </head>
      <body data-lens-root>
        <main data-lens-shell>
          <section data-lens-hero>
            <div>
              <span data-lens-kicker>HSX Lens</span>
              <h1>{manifest.appName}</h1>
            </div>
            <div data-lens-actions>
              <a href={`${basePath}/manifest.json`}>Manifest JSON</a>
            </div>
          </section>

          <section data-lens-metrics aria-label="Manifest summary">
            <div data-lens-metric>
              <span data-lens-label>Pages</span>
              <strong>{manifest.pages.length}</strong>
            </div>
            <div data-lens-metric>
              <span data-lens-label>Components</span>
              <strong>{manifest.components.length}</strong>
            </div>
            <div data-lens-metric>
              <span data-lens-label>Interactions</span>
              <strong>{manifest.interactions.length}</strong>
            </div>
            <div data-lens-metric>
              <span data-lens-label>Warnings</span>
              <strong>{manifest.warnings.length}</strong>
            </div>
          </section>

          <div data-lens-grid>
            <section data-lens-panel>
              <header>
                <span data-lens-label>Hypermedia Circuit Map</span>
                <h2>Trigger to route to target</h2>
              </header>
              {manifest.interactions.length === 0
                ? <p data-lens-empty>No HSX interactions found in samples.</p>
                : (
                  <ol data-lens-list>
                    {manifest.interactions.map((interaction) => (
                      <li data-lens-circuit>
                        <div data-lens-node="source">
                          <span data-lens-label>{interaction.page}</span>
                          <strong>{sourceLabel(interaction)}</strong>
                          <code>{interaction.elementPath}</code>
                        </div>
                        <span data-lens-arrow>{"->"}</span>
                        <div data-lens-node="route">
                          <span data-lens-label>
                            {interaction.sourceAttr ?? "swap"}
                          </span>
                          <code>{routeLabel(interaction)}</code>
                        </div>
                        <span data-lens-arrow>{"->"}</span>
                        <div data-lens-node="target">
                          <span data-lens-label>
                            {interaction.swap ?? "default swap"}
                          </span>
                          <code>{targetLabel(interaction)}</code>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
            </section>

            <div data-lens-side>
              <section data-lens-panel>
                <header>
                  <span data-lens-label>Agent Tools</span>
                  <h2>Callable components</h2>
                </header>
                <table data-lens-table>
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.components.filter((component) => component.agent)
                      .map((component) => (
                        <tr>
                          <td>
                            <code>{component.agent?.name}</code>
                          </td>
                          <td>
                            <code>
                              {component.agent?.method} {component.path}
                            </code>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>

              <section data-lens-panel>
                <header>
                  <span data-lens-label>Warnings</span>
                  <h2>Contract checks</h2>
                </header>
                {manifest.warnings.length === 0
                  ? <p data-lens-empty>No warnings.</p>
                  : (
                    <ol data-lens-list>
                      {manifest.warnings.map((warning) => (
                        <li data-lens-warning>
                          <strong>{warning.tag}</strong>
                          <p>{warning.message}</p>
                        </li>
                      ))}
                    </ol>
                  )}
              </section>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

function renderWorkbench(manifest: HsxManifest, basePath: string): Response {
  return render(<WorkbenchPage manifest={manifest} basePath={basePath} />);
}

function renderManifestJson(manifest: HsxManifest): Response {
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create an opt-in local HSX Lens route handler.
 */
export function createHsxLens(options: HsxLensOptions): HsxLens {
  const basePath = normalizeBasePath(options.basePath ?? "/__hsx");
  const manifest = createHsxManifest(options);

  return {
    manifest,

    handle(req: Request): Response | null {
      const { pathname } = new URL(req.url);
      if (pathname === basePath || pathname === `${basePath}/`) {
        return renderWorkbench(manifest, basePath);
      }
      if (pathname === `${basePath}/manifest.json`) {
        return renderManifestJson(manifest);
      }
      return null;
    },
  };
}
