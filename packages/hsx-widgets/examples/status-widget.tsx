/**
 * Status Widget - A second HSX widget example with query-param validation.
 *
 * Demonstrates a Widget<P> without `load`, where props are validated from
 * route/query params by the SSR adapter.
 */

import type { Widget } from "../widget.ts";
import { ok, fail } from "../result.ts";

type StatusTone = "ok" | "warn" | "error";

type StatusProps = {
  readonly label: string;
  readonly tone: StatusTone;
};

function normalizeTone(raw: unknown): StatusTone | null {
  if (typeof raw !== "string") return null;
  if (raw === "ok" || raw === "warn" || raw === "error") return raw;
  return null;
}

export const statusWidget: Widget<StatusProps> = {
  tag: "hsx-status",

  props: {
    validate(raw: unknown) {
      if (typeof raw !== "object" || raw === null) {
        return fail({
          tag: "validation_error",
          message: "Expected an object",
        });
      }

      const obj = raw as Record<string, unknown>;
      const label = obj.label;

      if (typeof label !== "string" || label.trim().length === 0) {
        return fail({
          tag: "validation_error",
          message: "Label is required",
          field: "label",
        });
      }

      const tone = normalizeTone(obj.tone) ?? "ok";

      return ok({ label: label.trim(), tone });
    },
  },

  styles: `
    .hsx-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: system-ui, sans-serif;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: #fff;
      color: #111827;
      font-size: 0.9rem;
      line-height: 1;
    }

    .hsx-status__dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      flex: 0 0 auto;
      background: #16a34a;
    }

    .hsx-status[data-tone="warn"] .hsx-status__dot { background: #d97706; }
    .hsx-status[data-tone="error"] .hsx-status__dot { background: #dc2626; }
  `,

  render(props) {
    return (
      <div class="hsx-status" data-tone={props.tone}>
        <span class="hsx-status__dot" />
        <strong>{props.label}</strong>
      </div>
    );
  },
};
