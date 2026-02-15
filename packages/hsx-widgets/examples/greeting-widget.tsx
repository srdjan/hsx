/**
 * Greeting Widget - A minimal HSX widget example.
 *
 * Demonstrates the Widget<P> protocol with validation, styles, and a
 * pure render function using only standard HTML elements.
 */

import type { Widget } from "../widget.ts";
import { ok, fail } from "../result.ts";

// =============================================================================
// Props
// =============================================================================

type GreetingProps = {
  readonly name: string;
  readonly message: string;
};

// =============================================================================
// Widget Definition
// =============================================================================

export const greetingWidget: Widget<GreetingProps> = {
  tag: "hsx-greeting",

  props: {
    validate(raw: unknown) {
      if (typeof raw !== "object" || raw === null) {
        return fail({
          tag: "validation_error",
          message: "Expected an object",
        });
      }

      const obj = raw as Record<string, unknown>;
      const name = obj.name;
      const message = obj.message;

      if (typeof name !== "string" || name.length === 0) {
        return fail({
          tag: "validation_error",
          message: "Name is required",
          field: "name",
        });
      }

      if (typeof message !== "string") {
        return fail({
          tag: "validation_error",
          message: "Message must be a string",
          field: "message",
        });
      }

      return ok({ name, message: message || `Hello, ${name}!` });
    },
  },

  styles: `
    .hsx-greeting { font-family: system-ui, sans-serif; padding: 1rem; }
    .hsx-greeting h2 { margin: 0 0 0.5rem 0; }
    .hsx-greeting p { margin: 0; color: #555; }
  `,

  render(props) {
    return (
      <div class="hsx-greeting">
        <h2>{props.name}</h2>
        <p>{props.message}</p>
      </div>
    );
  },

  load: async (params) => {
    const name = params.name;
    if (!name) {
      return fail({
        tag: "load_error",
        message: "Missing name parameter",
      });
    }
    return ok({ name, message: `Hello, ${name}!` });
  },
};
