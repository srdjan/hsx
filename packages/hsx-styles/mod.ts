/**
 * HSX Default Styles - Optional stylesheet for HSX applications.
 *
 * Provides a default light theme and a dark theme variant. CSS lives in
 * separate .css files for proper syntax highlighting and linting support.
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
 * // Optional: override theme colors
 * <style>{`:root { --hsx-accent: #10b981; }`}</style>
 * ```
 *
 * @module
 */

/** Default path for serving HSX styles */
export const HSX_STYLES_PATH: string = "/static/hsx.css";

/** Default theme (light, indigo accent) */
export const hsxStyles: string = Deno.readTextFileSync(
  new URL("./hsx.css", import.meta.url),
);

/** Dark theme variant */
export const hsxStylesDark: string = Deno.readTextFileSync(
  new URL("./hsx-dark.css", import.meta.url),
);
