/**
 * ATS (Applicant Tracking System) Example
 *
 * Demonstrates Light DOM web components with HSX: a background check widget
 * rendered as `<hsx-bgcheck>` custom element, styled entirely by host CSS.
 * HTMX handles all interactivity - polling, form submission, panel loading.
 */

// JSX type augmentation for the custom element tag
declare module "hsx/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "hsx-bgcheck": Record<string, unknown>;
    }
  }
}

import { hsxComponent, hsxPage, id } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import {
  bgcheckWidget,
  getCheckResult,
  initiateCheck,
  setCandidateLookup,
} from "./bgcheck-widget.tsx";

// =============================================================================
// Data Model
// =============================================================================

type CandidateStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

type Candidate = {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  status: CandidateStatus;
  readonly appliedAt: string;
};

const candidates: Candidate[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Senior Engineer", status: "screening", appliedAt: "2026-02-01" },
  { id: 2, name: "Bob Chen", email: "bob@example.com", role: "Product Manager", status: "interview", appliedAt: "2026-02-03" },
  { id: 3, name: "Carol Davis", email: "carol@example.com", role: "Designer", status: "applied", appliedAt: "2026-02-10" },
  { id: 4, name: "Dave Wilson", email: "dave@example.com", role: "Backend Engineer", status: "offer", appliedAt: "2026-01-25" },
  { id: 5, name: "Eva Martinez", email: "eva@example.com", role: "Data Scientist", status: "screening", appliedAt: "2026-02-08" },
];

function findCandidate(idVal: number): Candidate | undefined {
  return candidates.find((c) => c.id === idVal);
}

// Wire candidate lookup into the widget module
setCandidateLookup((idVal) => findCandidate(idVal)?.name);

// =============================================================================
// Branded IDs
// =============================================================================

const ids = {
  candidateList: id("candidate-list"),
  candidateDetail: id("candidate-detail"),
};

// =============================================================================
// Status Helpers
// =============================================================================

const STATUS_LABELS: Record<CandidateStatus, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const PIPELINE_STEPS: CandidateStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
];

// =============================================================================
// Background Check Widget SSR Wrapper
// =============================================================================

/**
 * Render the bgcheck widget inside its custom element tag.
 * When a check is in progress, the wrapper carries HTMX polling attributes
 * so the entire `<hsx-bgcheck>` element refreshes every 3s.
 */
function BgCheckElement({ candidateId }: { candidateId: number }) {
  const result = getCheckResult(candidateId);
  const name = findCandidate(candidateId)?.name ?? "Unknown";

  const validationResult = bgcheckWidget.props.validate({
    candidateId,
    candidateName: name,
    status: result.status,
    requestedAt: result.requestedAt,
    completedAt: result.completedAt,
    details: result.details,
  });

  if (!validationResult.ok) {
    return <hsx-bgcheck><p>Error loading background check.</p></hsx-bgcheck>;
  }

  const content = bgcheckWidget.render(validationResult.value);
  const isPolling = result.status === "pending" || result.status === "in_progress";

  if (isPolling) {
    return (
      <hsx-bgcheck
        get={`/bgcheck/${candidateId}`}
        trigger="every 3s"
        swap="outerHTML"
      >
        {content}
      </hsx-bgcheck>
    );
  }

  return <hsx-bgcheck>{content}</hsx-bgcheck>;
}

// =============================================================================
// HSX Components (Routes)
// =============================================================================

const CandidateList = hsxComponent("/candidates", {
  methods: ["GET"],
  handler: () => ({ candidates }),
  render: ({ candidates: items }) => (
    <div id={ids.candidateList.slice(1)} class="ats-candidate-list">
      {items.map((c) => (
        <a
          class="ats-candidate-card"
          get={`/candidates/${c.id}`}
          target={ids.candidateDetail}
          swap="innerHTML"
        >
          <span class="ats-candidate-name">{c.name}</span>
          <span class="ats-candidate-role">{c.role}</span>
          <span class={`ats-status-badge ats-status-${c.status}`}>
            {STATUS_LABELS[c.status]}
          </span>
        </a>
      ))}
    </div>
  ),
});

const CandidateDetail = hsxComponent("/candidates/:id", {
  methods: ["GET"],
  handler: (_req, params) => {
    const candidate = findCandidate(Number(params.id));
    if (!candidate) throw new Error("Candidate not found");
    return { candidate };
  },
  render: ({ candidate }) => (
    <div class="ats-detail-content">
      <div class="ats-detail-header">
        <h2>{candidate.name}</h2>
        <span class={`ats-status-badge ats-status-${candidate.status}`}>
          {STATUS_LABELS[candidate.status]}
        </span>
      </div>

      <dl class="ats-detail-fields">
        <dt>Email</dt>
        <dd>{candidate.email}</dd>
        <dt>Role</dt>
        <dd>{candidate.role}</dd>
        <dt>Applied</dt>
        <dd>{candidate.appliedAt}</dd>
      </dl>

      <div class="ats-pipeline">
        <h3>Pipeline</h3>
        <div class="ats-pipeline-steps">
          {PIPELINE_STEPS.map((step) => (
            <button
              class={`ats-pipeline-step ${step === candidate.status ? "active" : ""}`}
              post={`/candidates/${candidate.id}/status`}
              vals={{ status: step }}
              target={ids.candidateDetail}
              swap="innerHTML"
            >
              {STATUS_LABELS[step]}
            </button>
          ))}
          <button
            class={`ats-pipeline-step ats-pipeline-reject ${candidate.status === "rejected" ? "active" : ""}`}
            post={`/candidates/${candidate.id}/status`}
            vals={{ status: "rejected" }}
            target={ids.candidateDetail}
            swap="innerHTML"
          >
            Reject
          </button>
        </div>
      </div>

      <div class="ats-bgcheck-section">
        <h3>Background Check</h3>
        <BgCheckElement candidateId={candidate.id} />
      </div>
    </div>
  ),
});

const CandidateStatusUpdate = hsxComponent("/candidates/:id/status", {
  methods: ["POST"],
  handler: async (req, params) => {
    const form = await req.formData();
    const newStatus = form.get("status") as CandidateStatus;
    const candidate = findCandidate(Number(params.id));
    if (!candidate) throw new Error("Candidate not found");
    candidate.status = newStatus;
    return { candidate };
  },
  render: ({ candidate }) => (
    <CandidateDetail.Component candidate={candidate} />
  ),
});

const BgCheckRoute = hsxComponent("/bgcheck/:candidateId", {
  methods: ["GET"],
  handler: (_req, params) => {
    const candidateId = Number(params.candidateId);
    const candidate = findCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    return { candidateId };
  },
  render: ({ candidateId }) => <BgCheckElement candidateId={candidateId} />,
});

const BgCheckInitiate = hsxComponent("/bgcheck/:candidateId/initiate", {
  methods: ["POST"],
  handler: (_req, params) => {
    const candidateId = Number(params.candidateId);
    const candidate = findCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    initiateCheck(candidateId);
    return { candidateId };
  },
  render: ({ candidateId }) => <BgCheckElement candidateId={candidateId} />,
});

// =============================================================================
// Page
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>ATS - Applicant Tracking System</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
      <style>{`
        /* ATS Layout */
        .ats-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 0;
          min-height: 100vh;
        }

        .ats-sidebar {
          border-right: 1px solid var(--hsx-border, #e2e8f0);
          background: var(--hsx-bg, #f8fafc);
          overflow-y: auto;
        }

        .ats-sidebar-header {
          padding: 1rem 1.25rem;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--hsx-muted, #64748b);
          border-bottom: 1px solid var(--hsx-border, #e2e8f0);
        }

        .ats-detail {
          padding: 2rem;
          overflow-y: auto;
        }

        .ats-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--hsx-muted, #64748b);
          font-style: italic;
        }

        /* Candidate List */
        .ats-candidate-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .ats-candidate-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid var(--hsx-border, #e2e8f0);
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }

        .ats-candidate-card:hover {
          background: rgba(0, 0, 0, 0.03);
        }

        .ats-candidate-name {
          font-weight: 600;
          color: var(--hsx-text, #1e293b);
        }

        .ats-candidate-role {
          font-size: 0.875rem;
          color: var(--hsx-muted, #64748b);
        }

        /* Status Badges */
        .ats-status-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          width: fit-content;
        }

        .ats-status-applied    { background: #e0f2fe; color: #0369a1; }
        .ats-status-screening  { background: #fef3c7; color: #92400e; }
        .ats-status-interview  { background: #ede9fe; color: #6d28d9; }
        .ats-status-offer      { background: #d1fae5; color: #065f46; }
        .ats-status-hired      { background: #bbf7d0; color: #166534; }
        .ats-status-rejected   { background: #fee2e2; color: #991b1b; }

        /* Candidate Detail */
        .ats-detail-content { max-width: 640px; }

        .ats-detail-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ats-detail-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .ats-detail-fields {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 0.5rem 1rem;
          margin-bottom: 2rem;
        }

        .ats-detail-fields dt {
          font-weight: 500;
          color: var(--hsx-muted, #64748b);
          font-size: 0.875rem;
        }

        .ats-detail-fields dd {
          margin: 0;
        }

        /* Pipeline */
        .ats-pipeline { margin-bottom: 2rem; }

        .ats-pipeline h3 {
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--hsx-muted, #64748b);
          margin: 0 0 0.75rem 0;
        }

        .ats-pipeline-steps {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .ats-pipeline-step {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--hsx-border, #e2e8f0);
          border-radius: 0.375rem;
          background: white;
          cursor: pointer;
          font-size: 0.8125rem;
          color: var(--hsx-text, #1e293b);
          transition: background 0.15s, border-color 0.15s;
        }

        .ats-pipeline-step:hover { background: #f1f5f9; }

        .ats-pipeline-step.active {
          background: var(--hsx-accent, #3b82f6);
          color: white;
          border-color: var(--hsx-accent, #3b82f6);
        }

        .ats-pipeline-reject.active {
          background: #ef4444;
          border-color: #ef4444;
        }

        /* Background Check Widget (host styles for <hsx-bgcheck>) */
        hsx-bgcheck {
          display: block;
          border: 1px solid var(--hsx-border, #e2e8f0);
          border-radius: 0.5rem;
          padding: 1rem;
          margin-top: 0.5rem;
          background: white;
        }

        .bgcheck-form p { margin: 0 0 0.75rem 0; }

        .bgcheck-action {
          padding: 0.5rem 1rem;
          background: var(--hsx-accent, #3b82f6);
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .bgcheck-action:hover { opacity: 0.9; }

        .bgcheck-progress,
        .bgcheck-result {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bgcheck-status-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .bgcheck-status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .bgcheck-status-none       { background: #94a3b8; }
        .bgcheck-status-pending     { background: #f59e0b; }
        .bgcheck-status-in_progress { background: #3b82f6; animation: pulse 1.5s infinite; }
        .bgcheck-status-passed      { background: #22c55e; }
        .bgcheck-status-failed      { background: #ef4444; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .bgcheck-detail {
          margin: 0;
          font-size: 0.875rem;
          color: var(--hsx-muted, #64748b);
        }

        .bgcheck-completed {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--hsx-muted, #64748b);
        }

        /* Background Check Section */
        .ats-bgcheck-section h3 {
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--hsx-muted, #64748b);
          margin: 0 0 0.5rem 0;
        }
      `}</style>
    </head>
    <body>
      <div class="ats-layout">
        <div class="ats-sidebar">
          <div class="ats-sidebar-header">Candidates</div>
          <CandidateList.Component candidates={candidates} />
        </div>
        <div class="ats-detail" id={ids.candidateDetail.slice(1)}>
          <div class="ats-empty-state">
            Select a candidate to view details
          </div>
        </div>
      </div>
    </body>
  </html>
));

// =============================================================================
// Server
// =============================================================================

const components = [
  CandidateList,
  CandidateDetail,
  CandidateStatusUpdate,
  BgCheckRoute,
  BgCheckInitiate,
];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  for (const component of components) {
    const method = req.method as typeof component.methods[number];
    if (component.match(pathname) && component.methods.includes(method)) {
      return component.handle(req);
    }
  }

  if (pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response("// htmx.js not found", {
        status: 500,
        headers: { "content-type": "text/javascript" },
      });
    }
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
});
