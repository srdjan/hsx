import { hsxComponent, hsxPage } from "../../src/index.ts";
import { hsxStyles, HSX_STYLES_PATH } from "../../src/styles.ts";
import { Card, Subtitle, UserList } from "./components.tsx";

// =============================================================================
// Helpers
// =============================================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// =============================================================================
// Components (render-only)
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
    <li>
      <div class="user-row">
        <div class="avatar">{initials}</div>
        <div class="user-info">
          <div class="user-name">{props.name}</div>
          <div class="user-email">{props.email}</div>
        </div>
      </div>
    </li>
  );
}

function LoadMoreTrigger(props: { page: number }) {
  return (
    <div
      class="load-more"
      get={LoadMore}
      vals={{ page: props.page }}
      trigger="revealed"
      swap="outerHTML"
    >
      Loading more users...
    </div>
  );
}

// =============================================================================
// Data
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
// HSX Components
// =============================================================================

const Stats = hsxComponent("/content/stats", {
  methods: ["GET"],
  async handler() {
    await delay(800);
    return {};
  },
  render: () => (
    <>
      <h2>Statistics</h2>
      <StatsContent />
    </>
  ),
});

const Chart = hsxComponent("/content/chart", {
  methods: ["GET"],
  async handler() {
    await delay(1200);
    return {};
  },
  render: () => (
    <>
      <h2>Activity</h2>
      <ChartContent />
    </>
  ),
});

const LoadMore = hsxComponent("/content/more", {
  methods: ["GET"],
  async handler(req) {
    await delay(500);
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "2", 10);
    const start = (page - 2) * 3;
    const users = allUsers.slice(start, start + 3);
    const hasMore = start + 3 < allUsers.length;
    return { users, nextPage: hasMore ? page + 1 : null };
  },
  render: ({ users, nextPage }) => (
    <>
      {users.map((u) => <UserItem name={u.name} email={u.email} />)}
      {nextPage && <LoadMoreTrigger page={nextPage} />}
    </>
  ),
});

// =============================================================================
// Page
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Lazy Loading - HSX Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
      <style>{`:root { --hsx-accent: #10b981; --hsx-bg: #f0fdf4; --hsx-border: #d1fae5; --hsx-text: #064e3b; }`}</style>
    </head>
    <body>
      <main>
        <h1>Dashboard</h1>
        <Subtitle>Content loads lazily as it appears in viewport</Subtitle>
        <Card get={Stats} trigger="load" swap="innerHTML">
          <h2>Statistics</h2>
          <LoadingSkeleton type="stats" />
        </Card>
        <Card get={Chart} trigger="load" swap="innerHTML">
          <h2>Activity</h2>
          <LoadingSkeleton type="chart" />
        </Card>
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
));

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  const components = [Stats, Chart, LoadMore];
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
