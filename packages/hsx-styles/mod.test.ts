import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import * as styles from "./mod.ts";

Deno.test("hsxStyles bundles the vendored Auras core and HSX brand layer", () => {
  assertStringIncludes(
    styles.hsxStyles,
    "@layer reset, tokens, brands, defaults, layouts, components, utilities, print;",
  );
  assertStringIncludes(styles.hsxStyles, ':where([data-layout~="container"])');
  assertStringIncludes(styles.hsxStyles, "@layer brands");
  assertStringIncludes(styles.hsxStyles, "--hue-primary: 266;");
});

Deno.test("mod exports the default path and removes the legacy dark export", () => {
  assertEquals(styles.HSX_STYLES_PATH, "/static/hsx.css");
  assertEquals("hsxStylesDark" in styles, false);
  assert(styles.hsxStyles.length > 1000);
});
