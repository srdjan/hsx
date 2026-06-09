/**
 * Unit tests for the .events descriptor on HSX Components.
 *
 * A component gains an `.events` descriptor only when it declares `emits`
 * and/or `consumes`. The descriptor is pure metadata (parallel to `.agent`):
 * it documents what client-bus events the component participates in and wires
 * nothing - the element-level emit/on attributes do the wiring.
 *
 * Run with: deno test --allow-read packages/hsx/hsx-component-events.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "./hsx-component.ts";
import { event } from "./hsx-types.ts";
import { jsx } from "./jsx-runtime.ts";

const toast = event<{ message: string }>("toast");
const filterChanged = event<{ filter: string }>("filter-changed");

Deno.test("events descriptor is present when emits is set", () => {
  const C = hsxComponent("/x", {
    emits: [toast],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertExists(C.events);
  assertEquals(C.events.emits, ["toast"]);
  assertEquals(C.events.consumes, []);
});

Deno.test("events descriptor is present when consumes is set", () => {
  const C = hsxComponent("/x", {
    consumes: [filterChanged],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertExists(C.events);
  assertEquals(C.events.emits, []);
  assertEquals(C.events.consumes, ["filter-changed"]);
});

Deno.test("events descriptor carries both emits and consumes", () => {
  const C = hsxComponent("/x", {
    emits: [toast],
    consumes: [filterChanged],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertExists(C.events);
  assertEquals(C.events.emits, ["toast"]);
  assertEquals(C.events.consumes, ["filter-changed"]);
});

Deno.test("events descriptor is absent for a plain component (backward compat)", () => {
  const Plain = hsxComponent("/x", {
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertEquals(Plain.events, undefined);
});

Deno.test("events arrays are frozen", () => {
  const C = hsxComponent("/x", {
    emits: [toast],
    handler: () => ({}),
    render: () => jsx("div", {}),
  });
  assertExists(C.events);
  assertThrows(() => (C.events!.emits as string[]).push("nope"));
});

Deno.test("events and agent descriptors coexist independently", () => {
  const C = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo.",
    input: { schema: { type: "object" } },
    emits: [toast],
    handler: () => ({}),
    render: () => jsx("ul", {}),
  });
  assertExists(C.agent);
  assertExists(C.events);
  assertEquals(C.agent.method, "POST");
  assertEquals(C.events.emits, ["toast"]);
});
