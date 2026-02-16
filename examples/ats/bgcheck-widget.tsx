/**
 * Background Check Widget - External provider component for ATS integration.
 *
 * Renders into Light DOM as `<hsx-bgcheck>`, styled entirely by the host
 * application's global CSS through semantic class names. No Shadow DOM,
 * no iframes - just server-rendered HTML inside a custom element tag.
 *
 * Follows the Widget<P> protocol from @srdjan/hsx-widgets.
 */

import type { Widget } from "../../packages/hsx-widgets/widget.ts";
import { ok, fail } from "../../packages/hsx-widgets/result.ts";

// =============================================================================
// Types
// =============================================================================

type CheckStatus = "none" | "pending" | "in_progress" | "passed" | "failed";

type CheckResult = {
  readonly candidateId: number;
  readonly status: CheckStatus;
  readonly requestedAt: string | null;
  readonly completedAt: string | null;
  readonly details: string;
};

type BgCheckProps = {
  readonly candidateId: number;
  readonly candidateName: string;
  readonly status: CheckStatus;
  readonly requestedAt: string | null;
  readonly completedAt: string | null;
  readonly details: string;
};

// =============================================================================
// Data Store (represents the external provider's database)
// =============================================================================

const checkResults = new Map<number, CheckResult>();

let candidateLookup: (id: number) => string | undefined = () => undefined;

/** Wire candidate name resolution from the host app. */
export function setCandidateLookup(fn: (id: number) => string | undefined): void {
  candidateLookup = fn;
}

/** Look up the current check result for a candidate. */
export function getCheckResult(candidateId: number): CheckResult {
  return checkResults.get(candidateId) ?? {
    candidateId,
    status: "none",
    requestedAt: null,
    completedAt: null,
    details: "",
  };
}

// =============================================================================
// Simulation Logic
// =============================================================================

/**
 * Initiate a background check for a candidate.
 * Simulates async progression: pending -> in_progress (3s) -> passed/failed (8s).
 */
export function initiateCheck(candidateId: number): CheckResult {
  const now = new Date().toISOString();
  const result: CheckResult = {
    candidateId,
    status: "pending",
    requestedAt: now,
    completedAt: null,
    details: "Background check request submitted.",
  };
  checkResults.set(candidateId, result);

  // Advance to in_progress after 3s
  setTimeout(() => {
    const current = checkResults.get(candidateId);
    if (current && current.status === "pending") {
      checkResults.set(candidateId, {
        ...current,
        status: "in_progress",
        details: "Verifying employment history and references...",
      });
    }
  }, 3000);

  // Advance to passed/failed after 8s (80% pass rate)
  setTimeout(() => {
    const current = checkResults.get(candidateId);
    if (current && (current.status === "pending" || current.status === "in_progress")) {
      const passed = Math.random() < 0.8;
      checkResults.set(candidateId, {
        ...current,
        status: passed ? "passed" : "failed",
        completedAt: new Date().toISOString(),
        details: passed
          ? "All checks cleared. No issues found."
          : "Discrepancy found in employment history.",
      });
    }
  }, 8000);

  return result;
}

// =============================================================================
// Widget Definition
// =============================================================================

export const bgcheckWidget: Widget<BgCheckProps> = {
  tag: "hsx-bgcheck",

  shadow: "none",

  props: {
    validate(raw: unknown) {
      if (typeof raw !== "object" || raw === null) {
        return fail({ tag: "validation_error", message: "Expected an object" });
      }

      const obj = raw as Record<string, unknown>;
      const candidateId = typeof obj.candidateId === "number"
        ? obj.candidateId
        : Number(obj.candidateId);
      const candidateName = obj.candidateName;

      if (!Number.isFinite(candidateId) || candidateId <= 0) {
        return fail({
          tag: "validation_error",
          message: "candidateId must be a positive number",
          field: "candidateId",
        });
      }

      if (typeof candidateName !== "string" || candidateName.length === 0) {
        return fail({
          tag: "validation_error",
          message: "candidateName is required",
          field: "candidateName",
        });
      }

      return ok({
        candidateId,
        candidateName,
        status: (obj.status as CheckStatus) ?? "none",
        requestedAt: (obj.requestedAt as string) ?? null,
        completedAt: (obj.completedAt as string) ?? null,
        details: (obj.details as string) ?? "",
      });
    },
  },

  styles: "",

  render(props) {
    const { candidateId, candidateName, status, completedAt, details } = props;

    if (status === "none") {
      return (
        <div class="bgcheck-form">
          <p>
            Run a background check for <strong>{candidateName}</strong>
          </p>
          <button
            class="bgcheck-action"
            post={`/bgcheck/${candidateId}/initiate`}
            target="closest hsx-bgcheck"
            swap="outerHTML"
          >
            Start Background Check
          </button>
        </div>
      );
    }

    if (status === "pending" || status === "in_progress") {
      const statusLabel = status === "pending" ? "Pending" : "In Progress";
      return (
        <div class="bgcheck-progress">
          <div class="bgcheck-status-row">
            <span class={`bgcheck-status-dot bgcheck-status-${status}`} />
            <strong>{statusLabel}</strong>
          </div>
          <p class="bgcheck-detail">{details}</p>
        </div>
      );
    }

    // passed or failed
    const statusLabel = status === "passed" ? "Passed" : "Failed";
    const completedDate = completedAt
      ? new Date(completedAt).toLocaleString()
      : "N/A";

    return (
      <div class="bgcheck-result">
        <div class="bgcheck-status-row">
          <span class={`bgcheck-status-dot bgcheck-status-${status}`} />
          <strong>{statusLabel}</strong>
        </div>
        <p class="bgcheck-detail">{details}</p>
        <p class="bgcheck-completed">Completed: {completedDate}</p>
      </div>
    );
  },

  load: async (params) => {
    const candidateId = Number(params.candidateId);
    if (!Number.isFinite(candidateId) || candidateId <= 0) {
      return fail({ tag: "load_error", message: "Invalid candidateId" });
    }

    const name = candidateLookup(candidateId);
    if (!name) {
      return fail({ tag: "load_error", message: `Candidate ${candidateId} not found` });
    }

    const result = getCheckResult(candidateId);
    return ok({
      candidateId,
      candidateName: name,
      status: result.status,
      requestedAt: result.requestedAt,
      completedAt: result.completedAt,
      details: result.details,
    });
  },
};
