import { hsxComponent, hsxPage } from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";
import { ids } from "./ids.ts";

type Tab = "overview" | "details" | "settings";
type VoidProps = Record<string, never>;

const TABS_MODAL_STYLES = `
  :root {
    --primary: #8b5cf6;
    --primary-hover: #7c3aed;
    --primary-subtle: #ede9fe;
    --bg: #faf5ff;
    --surface: #ffffff;
    --surface-raised: #f5f3ff;
    --border: #ddd6fe;
    --text: #581c87;
    --text-muted: #7e22ce;
  }

  .tabs nav {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .tab {
    border-radius: var(--radius-full);
  }

  .tab[aria-selected="true"] {
    background: var(--primary);
    color: #fff;
    border-color: transparent;
    box-shadow: var(--shadow-sm);
  }

  .paragraph,
  .bullets,
  .notification {
    color: var(--text-muted);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .card-grid > div {
    min-height: 100%;
  }

  .btn-group {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .form-group {
    display: grid;
    gap: var(--space-2);
  }

  .toggle-group {
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: rgb(15 23 42 / 0.45);
    backdrop-filter: blur(10px);
  }

  .modal {
    width: min(100%, 28rem);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-xl);
    display: grid;
    gap: var(--space-4);
  }

  .notification {
    position: fixed;
    inset-inline-end: var(--space-4);
    inset-block-end: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: color-mix(in oklch, var(--color-success) 18%, white);
    color: var(--color-success);
    border: 1px solid color-mix(in oklch, var(--color-success) 35%, var(--border));
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 640px) {
    .card-grid {
      grid-template-columns: 1fr;
    }
  }
`;

function TabButton(props: { tab: Tab; current: Tab; label: string }) {
  const isActive = props.tab === props.current;
  const routeMap = {
    overview: TabOverview,
    details: TabDetails,
    settings: TabSettings,
  } as const;
  return (
    <button
      type="button"
      class="tab"
      data-variant="ghost"
      get={routeMap[props.tab]}
      target={ids.tabContent}
      swap="innerHTML"
      aria-selected={isActive ? "true" : "false"}
    >
      {props.label}
    </button>
  );
}

function TabNav(props: { current: Tab }) {
  return (
    <div class="tabs">
      <nav role="tablist">
        <TabButton tab="overview" current={props.current} label="Overview" />
        <TabButton tab="details" current={props.current} label="Details" />
        <TabButton tab="settings" current={props.current} label="Settings" />
      </nav>
    </div>
  );
}

function OverviewContent() {
  return (
    <>
      <h2>Overview</h2>
      <div class="paragraph">
        <p>Quick summary of your account.</p>
      </div>
      <div class="card-grid">
        <div data-surface="card" data-layout="stack" data-gap="2">
          <h3>Projects</h3>
          <p>12</p>
        </div>
        <div data-surface="card" data-layout="stack" data-gap="2">
          <h3>Tasks</h3>
          <p>48</p>
        </div>
        <div data-surface="card" data-layout="stack" data-gap="2">
          <h3>Completed</h3>
          <p>36</p>
        </div>
        <div data-surface="card" data-layout="stack" data-gap="2">
          <h3>In Progress</h3>
          <p>12</p>
        </div>
      </div>
      <div class="btn-group">
        <button
          type="button"
          data-variant="solid"
          get={ModalOpen}
          target="body"
          swap="beforeend"
        >
          Open Modal
        </button>
      </div>
    </>
  );
}

function DetailsContent() {
  return (
    <>
      <h2>Details</h2>
      <p>Detailed information about recent activity.</p>
      <div class="bullets">
        <ul>
          <li>Completed task "Update documentation"</li>
          <li>Created project "Q4 Planning"</li>
          <li>Added team member "Alex"</li>
        </ul>
      </div>
    </>
  );
}

function SettingsContent() {
  return (
    <>
      <h2>Settings</h2>
      <div class="form-group">
        <label>Display Name</label>
        <input type="text" value="John Doe" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" value="john@example.com" />
      </div>
      <div class="form-group toggle-group">
        <input type="checkbox" id="notif" checked />
        <label htmlFor="notif">Notifications</label>
      </div>
      <div class="btn-group">
        <button type="button" data-variant="solid">Save</button>
      </div>
    </>
  );
}

function ModalDialog() {
  return (
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <h2>Confirm Action</h2>
        <p>Are you sure you want to proceed?</p>
        <div class="btn-group">
          <button
            type="button"
            data-variant="ghost"
            get={ModalClose}
            target="#modal-overlay"
            swap="outerHTML"
          >
            Cancel
          </button>
          <button
            type="button"
            data-variant="solid"
            post={ModalConfirm}
            target={ids.modalContainer}
            swap="innerHTML"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Notification(props: { message: string }) {
  return <div class="notification" id="notification">{props.message}</div>;
}

// HSX Components

const TabOverview = hsxComponent("/tabs/overview", {
  methods: ["GET"],
  handler: () => ({} as VoidProps),
  render: () => <OverviewContent />,
});

const TabDetails = hsxComponent("/tabs/details", {
  methods: ["GET"],
  handler: () => ({} as VoidProps),
  render: () => <DetailsContent />,
});

const TabSettings = hsxComponent("/tabs/settings", {
  methods: ["GET"],
  handler: () => ({} as VoidProps),
  render: () => <SettingsContent />,
});

const ModalOpen = hsxComponent("/modal/open", {
  methods: ["GET"],
  handler: () => ({} as VoidProps),
  render: () => <ModalDialog />,
});

const ModalClose = hsxComponent("/modal/close", {
  methods: ["GET"],
  handler: () => ({} as VoidProps),
  render: () => null,
});

const ModalConfirm = hsxComponent("/modal/confirm", {
  methods: ["POST"],
  handler: () => ({ message: "✓ Action confirmed!" }),
  render: ({ message }: { message: string }) => (
    <Notification message={message} />
  ),
});

// Page

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Tabs & Modal - HSX Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
      <style>{TABS_MODAL_STYLES}</style>
    </head>
    <body>
      <main data-layout="container stack" data-gap="6">
        <header>
          <h1>Dashboard</h1>
        </header>
        <TabNav current="overview" />
        <div class="tab-content" id="tab-content" data-surface="card">
          <OverviewContent />
        </div>
      </main>
      <div id="modal-container"></div>
    </body>
  </html>
));

// Server

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  const components = [
    TabOverview,
    TabDetails,
    TabSettings,
    ModalOpen,
    ModalClose,
    ModalConfirm,
  ];

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
