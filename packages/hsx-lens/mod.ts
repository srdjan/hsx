/**
 * HSX Lens - opt-in hypermedia contract manifest and local workbench.
 *
 * @example
 * ```tsx
 * import { createHsxLens } from "@srdjan/hsx-lens";
 *
 * const lens = createHsxLens({
 *   appName: "Todos",
 *   pages: [{ name: "Home", path: "/", render: () => <Page.Component /> }],
 *   components: todoComponents,
 * });
 *
 * Deno.serve((req) => {
 *   const lensResponse = lens.handle(req);
 *   if (lensResponse) return lensResponse;
 *   return new Response("Not found", { status: 404 });
 * });
 * ```
 *
 * @module
 */

export {
  createHsxManifest,
  type HsxInteraction,
  type HsxLensComponent,
  type HsxLensWidget,
  type HsxManifest,
  type HsxManifestComponent,
  type HsxManifestOptions,
  type HsxManifestPage,
  type HsxManifestWidget,
  type HsxPageSample,
  type HsxTarget,
  type HsxWarning,
} from "./manifest.ts";

export {
  createHsxLens,
  type HsxLens,
  type HsxLensOptions,
} from "./workbench.tsx";
