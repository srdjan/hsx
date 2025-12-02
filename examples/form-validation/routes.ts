/**
 * Form Validation Example - Routes
 *
 * Demonstrates routes for inline validation and form submission.
 */
import { route } from "../../src/hsx-types.ts";

export const routes = {
  validate: {
    username: route("/validate/username", () => "/validate/username"),
    email: route("/validate/email", () => "/validate/email"),
    password: route("/validate/password", () => "/validate/password"),
  },
  register: route("/register", () => "/register"),
};

export type Routes = typeof routes;

