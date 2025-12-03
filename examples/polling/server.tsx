/**
 * Polling / Live Updates Example
 *
 * Demonstrates HSX features:
 * - `trigger="every 2s"` for polling at fixed intervals
 * - `trigger="load"` for initial load
 * - Conditional polling (stop when condition met)
 * - Live updating statistics and activity feeds
 */
import { render, renderHtml } from "../../src/index.ts";
import { Card, Subtitle } from "./components.tsx";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

const styles = `
:root { --accent: #f97316; --bg: #fff7ed; --surface: #fff; --border: #fed7aa; --text: #7c2d12; --muted: #9a3412; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 50rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 0.5rem; }
.subtitle { color: var(--muted); margin-bottom: 2rem; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
.card { background: var(--surface); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.card h2 { font-size: 0.875rem; color: var(--muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }

.stats { display: flex; gap: 2rem; }
.stat { text-align: center; }
.stat-value { font-size: 2rem; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.stat-label { font-size: 0.875rem; color: var(--muted); }
.stat-change { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 99px; display: inline-block; margin-top: 0.25rem; }
.stat-change.up { background: #dcfce7; color: #16a34a; }
.stat-change.down { background: #fee2e2; color: #dc2626; }

.feed { list-style: none; }
.feed-item { display: flex; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
.feed-item:last-child { border-bottom: none; }
.feed-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.875rem; flex-shrink: 0; }
.feed-content { flex: 1; }
.feed-text { font-size: 0.875rem; }
.feed-time { font-size: 0.75rem; color: var(--muted); }

.status { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
.status-dot.online { background: #22c55e; }
.status-dot.processing { background: #f59e0b; }
.status-dot.complete { background: #3b82f6; animation: none; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.progress { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
.progress-bar { height: 100%; background: var(--accent); transition: width 0.5s ease; }
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
    <ul class="feed" id="activity-feed">
      {recent.length === 0
        ? (
          <li class="feed-item">
            <div class="feed-text" style={{ color: "var(--muted)" }}>
              Waiting for activity...
            </div>
          </li>
        )
        : recent.map((a) => (
          <li class="feed-item">
            <div class="feed-avatar">{a.user[0]}</div>
            <div class="feed-content">
              <div class="feed-text">
                <strong>{a.user}</strong> {a.action}
              </div>
              <div class="feed-time">{timeAgo(a.time)}</div>
            </div>
          </li>
        ))}
    </ul>
  );
}

function ProcessStatus() {
  const done = progress >= 100;
  const statusClass = done ? "complete" : "processing";
  const statusText = done ? "Complete!" : `Processing... ${progress}%`;
  // If not done, continue polling; if done, no trigger (stop polling)
  const trigger = done ? undefined : "every 1s";
  return (
    <div
      id="connection-status"
      get={routes.status}
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

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Live Polling - HSX Example</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <h1>Live Dashboard</h1>
          <Subtitle>Data updates automatically via polling</Subtitle>
          <div class="grid">
            <Card title="Real-time Stats (every 2s)">
              <div get={routes.stats} trigger="load, every 2s" swap="outerHTML">
                <LiveStats />
              </div>
            </Card>
            <Card title="Activity Feed (every 3s)">
              <div get={routes.feed} trigger="load, every 3s" swap="outerHTML">
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
}

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") {
    // Reset state on page load
    progress = 0;
    activityLog.length = 0;
    return render(<Page />);
  }

  if (pathname === "/stats") {
    // Simulate changing data
    visitors += Math.floor(Math.random() * 10) - 3;
    activeUsers = Math.max(
      50,
      Math.min(150, activeUsers + Math.floor(Math.random() * 6) - 2),
    );
    requests += Math.floor(Math.random() * 50) + 10;
    return new Response(renderHtml(<LiveStats />), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/feed") {
    // Add random activity
    if (Math.random() > 0.3) activityLog.push(randomActivity());
    return new Response(renderHtml(<ActivityFeed />), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/status") {
    // Increment progress
    if (progress < 100) {
      progress = Math.min(100, progress + Math.floor(Math.random() * 15) + 5);
    }
    return new Response(renderHtml(<ProcessStatus />), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
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
