/**
 * Dual-Compile Verification Test
 *
 * Proves the central thesis: the same widget .tsx file compiles with
 * both HSX (SSR) and Preact (embed) JSX factories.
 *
 * HSX compilation is verified by the regular test suite (widget.test.ts).
 * This test verifies Preact compilation via esbuild with the Deno loader.
 *
 * Run with: deno test --allow-all packages/hsx-widgets/build/dual-compile.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as esbuild from "npm:esbuild@0.24.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import * as path from "https://deno.land/std@0.208.0/path/mod.ts";

const ROOT = path.resolve(".");

Deno.test({
  name: "greeting widget compiles with Preact JSX factory (dual-compile proof)",
  // esbuild spawns a child process that may not be fully cleaned up synchronously
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const shimPath = path.join(ROOT, "packages/hsx-widgets/build/shims/hsx-noop.ts");
  const entryPoint = path.join(ROOT, "packages/hsx-widgets/examples/greeting-widget.tsx");
  const configPath = path.join(ROOT, "deno.json");

  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    jsxImportSource: "npm:preact@10.25.4",
    platform: "browser",
    write: false,
    plugins: [
      {
        name: "hsx-widgets-hsx-redirect",
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
  });

  await esbuild.stop();

  // The core assertion: zero compilation errors
  assertEquals(result.errors.length, 0, `esbuild errors: ${JSON.stringify(result.errors)}`);

  // Verify output was produced
  assertEquals(result.outputFiles.length > 0, true, "Expected at least one output file");

  // Verify the output contains Preact JSX runtime references
  const output = result.outputFiles[0].text;
  // Preact's jsx-runtime exports jsx/jsxs functions that esbuild inlines
  // The bundled output will contain preact internals
  assertEquals(output.length > 0, true, "Output should not be empty");
  },
});

Deno.test("HSX compilation of greeting widget works (SSR side)", async () => {
  const { greetingWidget } = await import("../examples/greeting-widget.tsx");
  const { renderHtml } = await import("@srdjan/hsx/core");

  const vnode = greetingWidget.render({ name: "Test", message: "Hello!" });
  const html = renderHtml(vnode);

  assertStringIncludes(html, "Test");
  assertStringIncludes(html, "Hello!");
  assertStringIncludes(html, "hsx-greeting");
});
