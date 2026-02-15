/**
 * Embed Build - Compiles widgets for client-side embedding using esbuild.
 *
 * Swaps the JSX factory from HSX to Preact so the same widget render
 * function produces DOM nodes instead of HTML strings.
 *
 * Uses @luca/esbuild-deno-loader to resolve Deno-style imports (npm:, https:,
 * workspace specifiers) so esbuild can bundle everything standalone.
 *
 * @module embed-build
 */

import * as esbuild from "npm:esbuild@0.24.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import * as path from "https://deno.land/std@0.208.0/path/mod.ts";

// =============================================================================
// Types
// =============================================================================

export type EmbedBuildOptions = {
  /** Path to the widget entry file (e.g., "packages/loom/examples/greeting-widget.tsx"). */
  readonly entryPoint: string;
  /** Output directory for the built bundle. */
  readonly outDir: string;
  /** Whether to minify the output. Defaults to true. */
  readonly minify?: boolean;
  /** Path to the hsx-noop shim. Resolved relative to project root if not absolute. */
  readonly hsxShimPath?: string;
  /** Path to the deno.json config file (for import map resolution). */
  readonly configPath?: string;
};

export type EmbedBuildResult = {
  readonly ok: boolean;
  readonly errors: ReadonlyArray<esbuild.Message>;
  readonly warnings: ReadonlyArray<esbuild.Message>;
  readonly outputFiles: ReadonlyArray<string>;
};

// =============================================================================
// HSX Redirect Plugin
// =============================================================================

/**
 * esbuild plugin that redirects HSX imports to Preact equivalents.
 * Must run before the Deno loader plugins.
 */
function hsxRedirectPlugin(shimPath: string): esbuild.Plugin {
  return {
    name: "loom-hsx-redirect",
    setup(build) {
      // Redirect all @srdjan/hsx imports to the noop shim
      build.onResolve({ filter: /^@srdjan\/hsx/ }, () => ({
        path: shimPath,
      }));

      // Redirect hsx/jsx-runtime to preact/jsx-runtime (Deno loader handles npm: resolution)
      build.onResolve({ filter: /^hsx\/jsx-runtime/ }, () => ({
        path: "npm:preact@10.25.4/jsx-runtime",
        external: false,
      }));
    },
  };
}

// =============================================================================
// Build Function
// =============================================================================

/**
 * Build a widget for client-side embedding.
 *
 * Compiles the widget's .tsx file with Preact as the JSX factory,
 * producing a standalone ESM bundle.
 */
export async function buildEmbed(options: EmbedBuildOptions): Promise<EmbedBuildResult> {
  const shimPath = options.hsxShimPath
    ? path.resolve(options.hsxShimPath)
    : path.resolve("packages/loom/build/shims/hsx-noop.ts");

  const configPath = options.configPath
    ? path.resolve(options.configPath)
    : path.resolve("deno.json");

  const result = await esbuild.build({
    entryPoints: [options.entryPoint],
    outdir: options.outDir,
    bundle: true,
    format: "esm",
    target: "es2020",
    minify: options.minify ?? true,
    jsx: "automatic",
    jsxImportSource: "npm:preact@10.25.4",
    platform: "browser",
    plugins: [
      hsxRedirectPlugin(shimPath),
      ...denoPlugins({ configPath }),
    ],
    write: true,
    metafile: true,
  });

  const outputFiles = Object.keys(result.metafile?.outputs ?? {});

  await esbuild.stop();

  return {
    ok: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
    outputFiles,
  };
}
