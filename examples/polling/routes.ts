/**
 * Polling Example - Routes
 *
 * Demonstrates routes for polling-based live updates.
 */
import { route } from "../../src/hsx-types.ts";

export const routes = {
  stats: route("/stats", () => "/stats"),
  feed: route("/feed", () => "/feed"),
  status: route("/status", () => "/status"),
};

export type Routes = typeof routes;

