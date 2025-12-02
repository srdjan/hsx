/**
 * Tabs & Modal Example - Routes
 *
 * Demonstrates routes for tab navigation and modal dialogs.
 */
import { route } from "../../src/hsx-types.ts";

export const routes = {
  tabs: {
    overview: route("/tabs/overview", () => "/tabs/overview"),
    details: route("/tabs/details", () => "/tabs/details"),
    settings: route("/tabs/settings", () => "/tabs/settings"),
  },
  modal: {
    open: route("/modal/open", () => "/modal/open"),
    close: route("/modal/close", () => "/modal/close"),
    confirm: route("/modal/confirm", () => "/modal/confirm"),
  },
};

export type Routes = typeof routes;

