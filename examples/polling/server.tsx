import { hsxComponent, hsxPage } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import { Card, Subtitle } from "./components.tsx";

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
                <div class="feed-text" style={{ color: "var(--muted)" }}>
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
        <style>{`:root { --hsx-accent: #f97316; --hsx-bg: #fff7ed; --hsx-border: #fed7aa; --hsx-text: #7c2d12; --hsx-muted: #9a3412; }`}</style>
      </head>
      <body>
        <main>
          <header>
            <h1>Live Dashboard</h1>
          </header>
          <Subtitle>Data updates automatically via polling</Subtitle>
          <div class="grid">
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
