/**
 * Lazy Loading Example - Routes
 *
 * Demonstrates routes for lazy-loaded content sections.
 */
import { route } from "../../src/hsx-types.ts";

export const routes = {
  content: {
    stats: route("/content/stats", () => "/content/stats"),
    chart: route("/content/chart", () => "/content/chart"),
    users: route("/content/users", () => "/content/users"),
    loadMore: route("/content/more", () => "/content/more"),
  },
};

export type Routes = typeof routes;

