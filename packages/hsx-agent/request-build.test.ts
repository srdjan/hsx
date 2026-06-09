/**
 * Tests for toRequest: turning AI tool-call arguments into a real Request
 * that drives the component's own handle().
 */

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { hsxComponent } from "@srdjan/hsx";
import { toRequest } from "./request-build.ts";

Deno.test("toRequest form-encodes body fields for POST and builds the URL", async () => {
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo.",
    input: { schema: {} },
    handler: () => ({}),
    render: () => "ok",
  });

  const req = toRequest(AddTodo, { text: "milk" }, "http://localhost");

  assertEquals(req.method, "POST");
  assertEquals(new URL(req.url).pathname, "/todos");
  const form = await req.formData();
  assertEquals(form.get("text"), "milk");
});

Deno.test("toRequest places path params in the URL and other fields in the body", async () => {
  const ToggleTodo = hsxComponent("/todos/:id/toggle", {
    methods: ["POST"],
    describe: "Toggle a todo.",
    input: { schema: {} },
    handler: () => ({}),
    render: () => "ok",
  });

  const req = toRequest(
    ToggleTodo,
    { id: "42", done: true },
    "http://localhost",
  );

  assertEquals(new URL(req.url).pathname, "/todos/42/toggle");
  const form = await req.formData();
  assertEquals(form.get("done"), "true");
  assertEquals(form.get("id"), null); // id was consumed by the path
});

Deno.test("toRequest appends fields as query params for GET (no body)", () => {
  const Search = hsxComponent("/search", {
    methods: ["GET"],
    describe: "Search the catalog.",
    input: { schema: {} },
    handler: () => ({}),
    render: () => "ok",
  });

  const req = toRequest(Search, { q: "hello world" }, "http://localhost");

  assertEquals(req.method, "GET");
  const url = new URL(req.url);
  assertEquals(url.pathname, "/search");
  assertEquals(url.searchParams.get("q"), "hello world");
  assertEquals(req.body, null);
});

Deno.test("toRequest runs the input assert guard and propagates rejection", () => {
  const AddTodo = hsxComponent("/todos", {
    methods: ["POST"],
    describe: "Add a todo.",
    input: {
      schema: {},
      assert: () => {
        throw new Error("text required");
      },
    },
    handler: () => ({}),
    render: () => "ok",
  });

  assertThrows(
    () => toRequest(AddTodo, {}, "http://localhost"),
    Error,
    "text required",
  );
});
