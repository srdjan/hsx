/**
 * Active Search Example - Routes
 *
 * Demonstrates type-safe route definitions for a search feature.
 */
import { route } from "../../src/hsx-types.ts";

export const routes = {
  search: route("/search", () => "/search"),
};

export type Routes = typeof routes;

