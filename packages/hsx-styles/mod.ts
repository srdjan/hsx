/**
 * HSX Default Styles - Optional stylesheet for HSX applications.
 *
 * Provides a single bundled stylesheet built from a vendored Auras foundation
 * plus an HSX brand layer.
 *
 * @example
 * ```tsx
 * import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
 *
 * // Serve the stylesheet
 * if (url.pathname === HSX_STYLES_PATH) {
 *   return new Response(hsxStyles, {
 *     headers: { "content-type": "text/css; charset=utf-8" }
 *   });
 * }
 *
 * // In JSX <head>
 * <link rel="stylesheet" href={HSX_STYLES_PATH} />
 *
 * // Optional: override Auras tokens
 * <style>{`:root { --primary: #10b981; --bg: #f0fdf4; }`}</style>
 *
 * // Optional: force dark mode for a page
 * <html data-theme="dark">
 * ```
 *
 * @module
 */

/** Default path for serving HSX styles */
export const HSX_STYLES_PATH: string = "/static/hsx.css";

function readStylesheet(path: string): string {
  return Deno.readTextFileSync(new URL(path, import.meta.url)).trimEnd();
}

/** Bundled default stylesheet: vendored Auras Elements + HSX brand layer */
export const hsxStyles: string = [
  readStylesheet("./vendor/auras-elements.css"),
  readStylesheet("./hsx-brand.css"),
].join("\n\n");
