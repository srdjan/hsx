/**
 * Build Tasks CLI - Orchestrates esbuild compilation for Loom embeds.
 *
 * Usage:
 *   deno run --allow-all packages/loom/build/tasks.ts --target=embeds
 *   deno run --allow-all packages/loom/build/tasks.ts --target=embeds --entry=packages/loom/examples/greeting-widget.tsx --export=greetingWidget
 *   deno run --allow-all packages/loom/build/tasks.ts --target=snippet
 *   deno run --allow-all packages/loom/build/tasks.ts --target=all
 *   deno run --allow-all packages/loom/build/tasks.ts --target=all --entry=packages/loom/examples/greeting-widget.tsx --export=greetingWidget
 *
 * @module tasks
 */

import * as esbuild from "npm:esbuild@0.24.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import * as path from "https://deno.land/std@0.208.0/path/mod.ts";
import { generateEmbedEntry } from "./gen-entry.ts";

// =============================================================================
// Argument Parsing
// =============================================================================

type BuildTarget = "embeds" | "snippet" | "all";

type BuildArgs = {
  readonly target: BuildTarget;
  readonly entry?: string;
  readonly exportName?: string;
  readonly outDir?: string;
};
type WidgetTarget = {
  readonly entry: string;
  readonly exportName: string;
};

const DEFAULT_WIDGETS: ReadonlyArray<WidgetTarget> = [
  {
    entry: "packages/loom/examples/greeting-widget.tsx",
    exportName: "greetingWidget",
  },
  {
    entry: "packages/loom/examples/status-widget.tsx",
    exportName: "statusWidget",
  },
];

function parseArgs(args: string[]): BuildArgs {
  const parsed: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      parsed[match[1]] = match[2];
    }
  }

  const target = parsed.target as BuildTarget;
  if (!target || !["embeds", "snippet", "all"].includes(target)) {
    console.error("Usage: --target=embeds|snippet|all [--entry=path] [--export=name] [--outDir=path]");
    Deno.exit(1);
  }

  return {
    target,
    entry: parsed.entry,
    exportName: parsed.export,
    outDir: parsed.outDir ?? "dist/loom",
  };
}

function resolveWidgetTargets(args: BuildArgs): ReadonlyArray<WidgetTarget> {
  if (args.entry || args.exportName) {
    if (!args.entry || !args.exportName) {
      console.error("When using custom widget build, provide both --entry and --export.");
      return [];
    }
    return [{ entry: args.entry, exportName: args.exportName }];
  }
  return DEFAULT_WIDGETS;
}

async function resolveWidgetTag(
  entry: string,
  exportName: string,
): Promise<string | null> {
  const moduleUrl = path.toFileUrl(path.resolve(entry)).href;

  try {
    const mod = await import(moduleUrl);
    const candidate = mod[exportName] as { tag?: unknown } | undefined;

    if (!candidate || typeof candidate.tag !== "string") {
      console.error(
        `Expected "${exportName}" from ${entry} to export a widget with a string "tag".`,
      );
      return null;
    }

    return candidate.tag;
  } catch (error) {
    console.error(`Failed to import widget module: ${entry}`);
    console.error(error);
    return null;
  }
}

// =============================================================================
// Build: Embeds
// =============================================================================

async function buildSingleEmbed(
  target: WidgetTarget,
  args: BuildArgs,
): Promise<boolean> {
  const { entry, exportName } = target;
  const widgetTag = await resolveWidgetTag(entry, exportName);
  if (!widgetTag) return false;

  const outDir = path.resolve(args.outDir ?? "dist/loom");
  const configPath = path.resolve("deno.json");
  const shimPath = path.resolve("packages/loom/build/shims/hsx-noop.ts");
  const outFile = path.join(outDir, `${widgetTag}.js`);

  // Generate the entry point source
  const entrySource = generateEmbedEntry({
    widgetImportPath: path.toFileUrl(path.resolve(entry)).href,
    widgetExportName: exportName,
  });

  // Write temporary entry file
  const tmpEntry = path.join(outDir, "_entry.ts");
  await Deno.mkdir(outDir, { recursive: true });
  await Deno.writeTextFile(tmpEntry, entrySource);

  console.log(`Building embed from ${entry}...`);

  try {
    const result = await esbuild.build({
      entryPoints: [tmpEntry],
      outfile: outFile,
      bundle: true,
      format: "esm",
      target: "es2020",
      minify: true,
      jsx: "automatic",
      jsxImportSource: "npm:preact@10.25.4",
      platform: "browser",
      plugins: [
        {
          name: "loom-hsx-redirect",
          setup(build) {
            build.onResolve({ filter: /^@srdjan\/hsx/ }, () => ({
              path: shimPath,
            }));
            build.onResolve({ filter: /^hsx\/jsx-runtime/ }, () => ({
              path: "npm:preact@10.25.4/jsx-runtime",
              external: false,
            }));
          },
        },
        ...denoPlugins({ configPath }),
      ],
      write: true,
    });

    if (result.errors.length > 0) {
      console.error("Build errors:", result.errors);
      return false;
    }

    console.log(`Embed built to ${outFile}`);
    return true;
  } finally {
    // Clean up temp file
    try { await Deno.remove(tmpEntry); } catch { /* ignore */ }
  }
}

async function buildEmbeds(args: BuildArgs): Promise<boolean> {
  const targets = resolveWidgetTargets(args);
  if (targets.length === 0) return false;

  for (const target of targets) {
    const ok = await buildSingleEmbed(target, args);
    if (!ok) return false;
  }

  return true;
}

// =============================================================================
// Build: Snippet
// =============================================================================

async function buildSnippet(args: BuildArgs): Promise<boolean> {
  const outDir = path.resolve(args.outDir ?? "dist/loom");
  const configPath = path.resolve("deno.json");
  const snippetPath = path.resolve("packages/loom/embed/snippet.ts");

  await Deno.mkdir(outDir, { recursive: true });

  console.log("Building snippet script...");

  try {
    const result = await esbuild.build({
      entryPoints: [snippetPath],
      outdir: outDir,
      bundle: true,
      format: "iife",
      target: "es2020",
      minify: true,
      platform: "browser",
      plugins: [...denoPlugins({ configPath })],
      write: true,
    });

    if (result.errors.length > 0) {
      console.error("Build errors:", result.errors);
      return false;
    }

    console.log(`Snippet built to ${outDir}/snippet.js`);
    return true;
  }
}

// =============================================================================
// Main
// =============================================================================

if (import.meta.main) {
  const args = parseArgs(Deno.args);
  let success = true;

  if (args.target === "embeds" || args.target === "all") {
    success = await buildEmbeds(args) && success;
  }

  if (args.target === "snippet" || args.target === "all") {
    success = await buildSnippet(args) && success;
  }

  await esbuild.stop();

  if (!success) {
    Deno.exit(1);
  }
}
