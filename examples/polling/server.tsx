import { hsxComponent, hsxPage } from "@srdjan/hsx";
import { HSX_STYLES_PATH, hsxStyles } from "@srdjan/hsx-styles";
import { Card, Subtitle } from "./components.tsx";

const POLLING_STYLES = `
  :root {
    --primary: #f97316;
    --primary-hover: #ea580c;
    --primary-subtle: #ffedd5;
    --bg: #fff7ed;
    --surface: #ffffff;
    --surface-raised: #ffedd5;
    --border: #fdba74;
    --text: #7c2d12;
    --text-muted: #9a3412;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .stat {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--surface-raised);
  }

  .stat-value {
    font-size: var(--text-xl);
    font-weight: 700;
  }

  .stat-label,
  .feed-time {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .stat-change {
    display: inline-flex;
    margin-top: var(--space-2);
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .stat-change.up {
    background: color-mix(in oklch, var(--color-success) 18%, white);
    color: var(--color-success);
  }

  .stat-change.down {
    background: color-mix(in oklch, var(--color-error) 16%, white);
    color: var(--color-error);
  }

  .feed ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .feed-item {
    display: flex;
    gap: var(--space-3);
    align-items: start;
    padding: var(--space-3) 0;
    border-bottom: 1px solid color-mix(in oklch, var(--border) 75%, transparent);
  }

  .feed li:last-child .feed-item {
    border-bottom: 0;
  }

  .feed-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    border-radius: 9999px;
    background: var(--primary-subtle);
    font-weight: 700;
  }

  .feed-content {
    display: grid;
    gap: 0.2rem;
  }

  .status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
  }

  .status-dot {
    inline-size: 0.65rem;
    block-size: 0.65rem;
    border-radius: 9999px;
    background: var(--color-warning);
  }

  .status-dot.complete {
    background: var(--color-success);
  }

  .progress {
    margin-top: var(--space-3);
    min-height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--surface-raised);
    overflow: hidden;
  }

  .progress-bar {
    min-height: 0.75rem;
    background: linear-gradient(90deg, color-mix(in oklch, var(--primary) 72%, white), var(--primary));
    transition: width var(--transition-base);
  }

  @media (max-width: 640px) {
    .stats {
      grid-template-columns: 1fr;
    }
  }
`;

// Simulated live data
let visitors = 1247;
let activeUsers = 89;
let requests = 5678;
let progress = 0;
const activityLog: { user: string; action: string; time: number }[] = [];
const users = ["Alice", "Bob", "Carol", "Dave", "Eva", "Frank"];
const actions = [
  "viewed dashboard",
  "updated profile",
  "created task",
  "completed item",
  "added comment",
];

function randomActivity() {
  return {
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    time: Date.now(),
  };
}

function LiveStats() {
  const vChange = Math.floor(Math.random() * 20) - 5;
  const aChange = Math.floor(Math.random() * 10) - 3;
  return (
    <div class="stats" id="live-stats">
      <div class="stat">
        <div class="stat-value">{visitors.toLocaleString()}</div>
        <div class="stat-label">Visitors</div>
        <span class={`stat-change ${vChange >= 0 ? "up" : "down"}`}>
          {vChange >= 0 ? "+" : ""}
          {vChange}
        </span>
      </div>
      <div class="stat">
        <div class="stat-value">{activeUsers}</div>
        <div class="stat-label">Active</div>
        <span class={`stat-change ${aChange >= 0 ? "up" : "down"}`}>
          {aChange >= 0 ? "+" : ""}
          {aChange}
        </span>
      </div>
      <div class="stat">
        <div class="stat-value">{requests.toLocaleString()}</div>
        <div class="stat-label">Requests</div>
      </div>
    </div>
  );
}

function ActivityFeed() {
  const recent = activityLog.slice(-5).reverse();
  const timeAgo = (t: number) => {
    const s = Math.floor((Date.now() - t) / 1000);
    return s < 60 ? "just now" : `${Math.floor(s / 60)}m ago`;
  };
  return (
    <div class="feed" id="activity-feed">
      <ul>
        {recent.length === 0
          ? (
            <li>
              <div class="feed-item">
                <div class="feed-text" style={{ color: "var(--text-muted)" }}>
                  Waiting for activity...
                </div>
              </div>
            </li>
          )
          : recent.map((a) => (
            <li>
              <div class="feed-item">
                <div class="feed-avatar">{a.user[0]}</div>
                <div class="feed-content">
                  <div class="feed-text">
                    <strong>{a.user}</strong> {a.action}
                  </div>
                  <div class="feed-time">{timeAgo(a.time)}</div>
                </div>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

function ProcessStatus() {
  const done = progress >= 100;
  const statusClass = done ? "complete" : "processing";
  const statusText = done ? "Complete!" : `Processing... ${progress}%`;
  const trigger = done ? undefined : "every 1s";
  return (
    <div
      id="connection-status"
      get={Status}
      trigger={trigger}
      swap="outerHTML"
    >
      <div class="status">
        <span class={`status-dot ${statusClass}`} />
        <span>{statusText}</span>
      </div>
      <div class="progress">
        <div class="progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// HSX Components

const Stats = hsxComponent("/stats", {
  methods: ["GET"],
  handler: () => {
    visitors += Math.floor(Math.random() * 10) - 3;
    activeUsers = Math.max(
      50,
      Math.min(150, activeUsers + Math.floor(Math.random() * 6) - 2),
    );
    requests += Math.floor(Math.random() * 50) + 10;
    return {};
  },
  render: () => <LiveStats />,
});

const Feed = hsxComponent("/feed", {
  methods: ["GET"],
  handler: () => {
    if (Math.random() > 0.3) activityLog.push(randomActivity());
    return {};
  },
  render: () => <ActivityFeed />,
});

const Status = hsxComponent("/status", {
  methods: ["GET"],
  handler: () => {
    if (progress < 100) {
      progress = Math.min(100, progress + Math.floor(Math.random() * 15) + 5);
    }
    return {};
  },
  render: () => <ProcessStatus />,
});

// Page

const Page = hsxPage(() => {
  visitors = 1247;
  activeUsers = 89;
  requests = 5678;
  progress = 0;
  activityLog.length = 0;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Live Polling - HSX Example</title>
        <link rel="stylesheet" href={HSX_STYLES_PATH} />
        <style>{POLLING_STYLES}</style>
      </head>
      <body>
        <main data-layout="container stack" data-gap="6">
          <header>
            <h1>Live Dashboard</h1>
          </header>
          <Subtitle>Data updates automatically via polling</Subtitle>
          <div data-layout="grid" data-gap="4" data-grid-min="md">
            <Card title="Real-time Stats (every 2s)">
              <div get={Stats} trigger="load, every 2s" swap="outerHTML">
                <LiveStats />
              </div>
            </Card>
            <Card title="Activity Feed (every 3s)">
              <div get={Feed} trigger="load, every 3s" swap="outerHTML">
                <ActivityFeed />
              </div>
            </Card>
          </div>
          <Card title="Background Process (stops at 100%)">
            <ProcessStatus />
          </Card>
        </main>
      </body>
    </html>
  );
});

// Server

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  const components = [Stats, Feed, Status];
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
