/**
 * Lazy Loading Example
 *
 * Demonstrates HSX features:
 * - `trigger="load"` for load-on-render content
 * - `trigger="revealed"` for infinite scroll / viewport loading
 * - `swap="outerHTML"` to replace the loading placeholder
 * - Loading skeleton placeholders
 */
import { render, renderHtml } from "../../src/index.ts";
import { Card, Subtitle, UserList } from "./components.tsx";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root { --accent: #10b981; --bg: #f0fdf4; --surface: #fff; --border: #d1fae5; --text: #064e3b; --muted: #6b7280; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 50rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 0.5rem; }
.subtitle { color: var(--muted); margin-bottom: 2rem; }

/* Cards */
.card { background: var(--surface); border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
.card h2 { font-size: 1rem; color: var(--muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }

/* Loading skeleton */
.skeleton { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skeleton-text { height: 1rem; width: 60%; margin-bottom: 0.5rem; }
.skeleton-stat { height: 2.5rem; width: 40%; }
.skeleton-chart { height: 120px; width: 100%; }

/* Stats grid */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.stat { text-align: center; }
.stat-value { font-size: 2rem; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 0.875rem; color: var(--muted); }

/* Chart placeholder */
.chart { display: flex; align-items: flex-end; gap: 0.5rem; height: 120px; }
.bar { background: var(--accent); border-radius: 4px 4px 0 0; flex: 1; transition: height 0.3s; }

/* User list for infinite scroll */
.user-list { list-style: none; }
.user-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
.user-item:last-child { border-bottom: none; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; }
.user-info { flex: 1; }
.user-name { font-weight: 500; }
.user-email { font-size: 0.875rem; color: var(--muted); }
.load-more { text-align: center; padding: 1rem; color: var(--muted); }
`;

// =============================================================================
// Components
// =============================================================================

function LoadingSkeleton(props: { type: "stats" | "chart" | "text" }) {
  if (props.type === "stats") {
    return (
      <div class="stats">
        <div class="stat">
          <div class="skeleton skeleton-stat" />
        </div>
        <div class="stat">
          <div class="skeleton skeleton-stat" />
        </div>
        <div class="stat">
          <div class="skeleton skeleton-stat" />
        </div>
      </div>
    );
  }
  if (props.type === "chart") return <div class="skeleton skeleton-chart" />;
  return (
    <>
      <div class="skeleton skeleton-text" />
      <div class="skeleton skeleton-text" style={{ width: "40%" }} />
    </>
  );
}

function StatsContent() {
  return (
    <div class="stats">
      <div class="stat">
        <div class="stat-value">1,234</div>
        <div class="stat-label">Users</div>
      </div>
      <div class="stat">
        <div class="stat-value">567</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat">
        <div class="stat-value">89%</div>
        <div class="stat-label">Retention</div>
      </div>
    </div>
  );
}

function ChartContent() {
  const heights = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];
  return (
    <div class="chart">
      {heights.map((h) => <div class="bar" style={{ height: `${h}%` }} />)}
    </div>
  );
}

function UserItem(props: { name: string; email: string }) {
  const initials = props.name.split(" ").map((n) => n[0]).join("");
  return (
    <li class="user-item">
      <div class="avatar">{initials}</div>
      <div class="user-info">
        <div class="user-name">{props.name}</div>
        <div class="user-email">{props.email}</div>
      </div>
    </li>
  );
}

function LoadMoreTrigger(props: { page: number }) {
  // This element triggers loading more users when it becomes visible (revealed)
  return (
    <div
      class="load-more"
      get={routes.content.loadMore}
      vals={{ page: props.page }}
      trigger="revealed"
      swap="outerHTML"
    >
      Loading more users...
    </div>
  );
}

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Lazy Loading - HSX Example</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <h1>Dashboard</h1>
          <Subtitle>Content loads lazily as it appears in viewport</Subtitle>
          {/* Load immediately when rendered (trigger="load") */}
          <Card
            get={routes.content.stats}
            trigger="load"
            swap="innerHTML"
          >
            <h2>Statistics</h2>
            <LoadingSkeleton type="stats" />
          </Card>
          <Card
            get={routes.content.chart}
            trigger="load"
            swap="innerHTML"
          >
            <h2>Activity</h2>
            <LoadingSkeleton type="chart" />
          </Card>
          {/* Infinite scroll: load more when trigger element is revealed */}
          <Card>
            <h2>Team Members</h2>
            <UserList>
              <UserItem name="Alice Johnson" email="alice@example.com" />
              <UserItem name="Bob Smith" email="bob@example.com" />
              <UserItem name="Carol Williams" email="carol@example.com" />
              <LoadMoreTrigger page={2} />
            </UserList>
          </Card>
        </main>
      </body>
    </html>
  );
}

// =============================================================================
// Sample user data for infinite scroll
// =============================================================================

const allUsers = [
  { name: "David Brown", email: "david@example.com" },
  { name: "Eva Martinez", email: "eva@example.com" },
  { name: "Frank Lee", email: "frank@example.com" },
  { name: "Grace Chen", email: "grace@example.com" },
  { name: "Henry Wilson", email: "henry@example.com" },
  { name: "Ivy Taylor", email: "ivy@example.com" },
  { name: "Jack Anderson", email: "jack@example.com" },
  { name: "Kate Thomas", email: "kate@example.com" },
];

// =============================================================================
// Server
// =============================================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return render(<Page />);

  if (pathname === "/content/stats") {
    await delay(800); // Simulate API latency
    return new Response(
      renderHtml(
        <>
          <h2>Statistics</h2>
          <StatsContent />
        </>,
      ),
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (pathname === "/content/chart") {
    await delay(1200); // Simulate slower API
    return new Response(
      renderHtml(
        <>
          <h2>Activity</h2>
          <ChartContent />
        </>,
      ),
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (pathname === "/content/more") {
    await delay(500);
    const page = parseInt(url.searchParams.get("page") ?? "2", 10);
    const start = (page - 2) * 3;
    const users = allUsers.slice(start, start + 3);
    const hasMore = start + 3 < allUsers.length;

    const html = renderHtml(
      <>
        {users.map((u) => <UserItem name={u.name} email={u.email} />)}
        {hasMore && <LoadMoreTrigger page={page + 1} />}
      </>,
    );
    return new Response(html, {
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
