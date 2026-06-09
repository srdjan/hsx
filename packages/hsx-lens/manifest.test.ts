/**
 * Tests for HSX Lens manifest extraction and workbench routes.
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { hsxComponent, id, route } from "@srdjan/hsx";
import { jsx } from "hsx/jsx-runtime";
import { createHsxLens, createHsxManifest } from "./mod.ts";

const ids = {
  results: id("results"),
  spinner: id("spinner"),
};

const SearchRoute = route("/search", () => "/search");

function samplePage() {
  return jsx("html", {
    children: [
      jsx("head", { children: jsx("title", { children: "Search" }) }),
      jsx("body", {
        children: jsx("main", {
          children: [
            jsx("form", {
              id: "search-form",
              get: SearchRoute,
              target: ids.results,
              swap: "outerHTML",
              trigger: "change",
              indicator: ids.spinner,
              vals: { q: "milk" },
              children: jsx("input", { name: "q" }),
            }),
            jsx("div", { id: "results", children: "Results" }),
            jsx("span", { id: "spinner", children: "Loading" }),
            jsx("ul", {
              id: "todo-list",
              swapOob: "true",
              children: jsx("li", { children: "One" }),
            }),
          ],
        }),
      }),
    ],
  });
}

Deno.test("createHsxManifest extracts interactions and targets from page samples", () => {
  const manifest = createHsxManifest({
    appName: "Search App",
    pages: [{ name: "Home", path: "/", render: samplePage }],
  });

  assertEquals(manifest.version, 1);
  assertEquals(manifest.pages, [{ name: "Home", path: "/" }]);
  assertEquals(manifest.targets.map((target) => target.selector), [
    "#search-form",
    "#results",
    "#spinner",
    "#todo-list",
  ]);

  const search = manifest.interactions.find((entry) =>
    entry.sourceAttr === "get"
  );
  assertExists(search);
  assertEquals(search.method, "GET");
  assertEquals(search.url, "/search");
  assertEquals(search.routePath, "/search");
  assertEquals(search.target, "#results");
  assertEquals(search.swap, "outerHTML");
  assertEquals(search.trigger, "change");
  assertEquals(search.indicator, "#spinner");
  assertEquals(search.vals, { q: "milk" });

  const oob = manifest.interactions.find((entry) => entry.swapOob === "true");
  assertExists(oob);
  assertEquals(oob.tag, "ul");
  assertEquals(manifest.warnings, []);
});

Deno.test("createHsxManifest warns when simple id targets are missing", () => {
  const manifest = createHsxManifest({
    appName: "Broken App",
    pages: [{
      name: "Home",
      path: "/",
      render: () =>
        jsx("html", {
          children: [
            jsx("head", { children: jsx("title", { children: "Broken" }) }),
            jsx("body", {
              children: jsx("button", {
                post: "/save",
                target: "#missing",
                children: "Save",
              }),
            }),
          ],
        }),
    }],
  });

  assertEquals(manifest.warnings.length, 1);
  assertEquals(manifest.warnings[0].tag, "missing_target");
  if (manifest.warnings[0].tag === "missing_target") {
    assertEquals(manifest.warnings[0].selector, "#missing");
    assertEquals(manifest.warnings[0].attr, "target");
  }
});

Deno.test("createHsxManifest mirrors agent metadata and warns on duplicates", () => {
  const schema = { type: "object", properties: {} } as const;
  const first = hsxComponent("/todos", {
    methods: ["POST"],
    agentName: "dup_tool",
    describe: "Add a todo.",
    input: { schema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });
  const second = hsxComponent("/todos", {
    methods: ["POST"],
    agentName: "dup_tool",
    describe: "Also add a todo.",
    input: { schema },
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });

  const manifest = createHsxManifest({
    appName: "Todos",
    components: [first, second],
  });

  assertEquals(manifest.components[0].agent?.name, "dup_tool");
  assertEquals(manifest.components[0].agent?.method, "POST");
  assertEquals(manifest.components[0].agent?.schema, schema);
  assertEquals(
    manifest.warnings.map((warning) => warning.tag),
    ["duplicate_component_route", "duplicate_agent_tool"],
  );
});

Deno.test("createHsxManifest includes widget metadata without rendering widgets", () => {
  const manifest = createHsxManifest({
    appName: "Widget App",
    widgets: [{
      tag: "hsx-status",
      description: "Shows status.",
      schema: { type: "object" },
      category: "display",
      shadow: "open",
      observed: ["label"],
    }],
  });

  assertEquals(manifest.widgets, [{
    tag: "hsx-status",
    description: "Shows status.",
    schema: { type: "object" },
    category: "display",
    shadow: "open",
    observed: ["label"],
  }]);
});

Deno.test("createHsxLens serves the workbench and manifest JSON", async () => {
  const lens = createHsxLens({
    appName: "Search App",
    pages: [{ name: "Home", path: "/", render: samplePage }],
  });

  const page = lens.handle(new Request("http://localhost/__hsx"));
  assertExists(page);
  assertEquals(page.status, 200);
  const html = await page.text();
  assertStringIncludes(html, "HSX Lens");
  assertStringIncludes(html, "Search App");
  assertStringIncludes(html, "Manifest JSON");

  const json = lens.handle(new Request("http://localhost/__hsx/manifest.json"));
  assertExists(json);
  assertEquals(
    json.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  const body = await json.json();
  assertEquals(body.appName, "Search App");
  assertEquals(body.version, 1);

  assertEquals(lens.handle(new Request("http://localhost/elsewhere")), null);
});
