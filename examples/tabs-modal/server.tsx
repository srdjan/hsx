/** @jsxImportSource ../../src */
import { hsxComponent, hsxPage } from "../../src/index.ts";
import { ids } from "./ids.ts";

const styles = `
:root { --accent: #8b5cf6; --bg: #faf5ff; --surface: #fff; --border: #e9d5ff; --text: #581c87; --muted: #9333ea; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 40rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 1.5rem; }
.tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 1rem; }
.tab { padding: 0.75rem 1.5rem; background: none; border: none; font: inherit; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab:hover { color: var(--accent); }
.tab[aria-selected="true"] { color: var(--accent); border-bottom-color: var(--accent); font-weight: 500; }
.tab-content { background: var(--surface); padding: 1.5rem; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); min-height: 200px; }
.card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.card { background: var(--bg); padding: 1rem; border-radius: 8px; }
.card h3 { font-size: 0.875rem; color: var(--muted); margin-bottom: 0.5rem; }
.card p { font-size: 1.5rem; font-weight: 600; }
.btn { padding: 0.5rem 1rem; border-radius: 6px; border: none; font: inherit; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: #7c3aed; }
.btn-secondary { background: var(--border); color: var(--text); }
.btn-danger { background: #dc2626; color: #fff; }
.btn-group { display: flex; gap: 0.5rem; margin-top: 1rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity: 0; } }
.modal { background: var(--surface); border-radius: 12px; padding: 1.5rem; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal h2 { margin-bottom: 1rem; }
.modal p { color: var(--muted); margin-bottom: 1rem; }
.notification { position: fixed; bottom: 1rem; right: 1rem; background: #10b981; color: #fff; padding: 1rem 1.5rem; border-radius: 8px; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
.form-group input, .form-group select { width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; font: inherit; }
.toggle { display: flex; align-items: center; gap: 0.5rem; }
.toggle input { width: auto; }
.paragraph p { margin-bottom: 1rem; }
.bullets ul { margin-top: 1rem; padding-left: 1.5rem; }
`;

type Tab = "overview" | "details" | "settings";

type TabState = { current: Tab };

type VoidProps = Record<string, never>;

function TabButton(props: { tab: Tab; current: Tab; label: string }) {
  const isActive = props.tab === props.current;
  const routeMap = {
    overview: TabOverview,
    details: TabDetails,
    settings: TabSettings,
  } as const;
  return (
    <button
      class="tab"
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
        <div class="card">
          <h3>Projects</h3>
          <p>12</p>
        </div>
        <div class="card">
          <h3>Tasks</h3>
          <p>48</p>
        </div>
        <div class="card">
          <h3>Completed</h3>
          <p>36</p>
        </div>
        <div class="card">
          <h3>In Progress</h3>
          <p>12</p>
        </div>
      </div>
      <div class="btn-group">
        <button
          class="btn btn-primary"
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
      <div class="form-group toggle">
        <input type="checkbox" id="notif" checked />
        <label htmlFor="notif">Notifications</label>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary">Save</button>
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
            class="btn btn-secondary"
            get={ModalClose}
            target="#modal-overlay"
            swap="outerHTML"
          >
            Cancel
          </button>
          <button
            class="btn btn-danger"
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

// HSX Components for tabs and modal actions

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
  render: () => <></>,
});

const ModalConfirm = hsxComponent("/modal/confirm", {
  methods: ["POST"],
  handler: () => ({ message: "✓ Action confirmed!" }),
  render: ({ message }: { message: string }) => <Notification message={message} />,
});

// Page

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Tabs & Modal - HSX Example</title>
      <style>{styles}</style>
    </head>
    <body>
      <main>
        <header>
          <h1>Dashboard</h1>
        </header>
        <TabNav current="overview" />
        <div class="tab-content" id="tab-content">
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

  return new Response("Not found", { status: 404 });
});
