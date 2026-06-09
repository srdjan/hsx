/**
 * Event Bus Example
 *
 * Demonstrates HSX's client-side pub/sub bus - the one small authored client
 * runtime. Filter pills, a toast, and optimistic add all react in the browser
 * with NO server round-trip. A single bridge element proves the same event
 * also drives a real HTMX request via `trigger="... from:body"`.
 *
 * Run: deno task example:event-bus  (then open http://localhost:8000)
 */

import { HsxBus, hsxPage } from "@srdjan/hsx";
import { events } from "./events.ts";
import { ids } from "./ids.ts";
import { Stats } from "./components.tsx";

const STYLES = `
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; margin: 0; background: #f9fafb; color: #1f2937; }
main { max-width: 40rem; margin: 0 auto; padding: 1.5rem; }
h1 { font-size: 1.4rem; }
.row { display: flex; gap: 0.5rem; align-items: center; margin: 1rem 0; }
.pills button, .toast-btn, .add input {
  border: 1px solid #d1d5db; border-radius: 0.5rem; background: #fff;
  padding: 0.4rem 0.8rem; font: inherit; cursor: pointer;
}
/* Active pill highlight - pure CSS off the container's data-active */
.pills[data-active="all"] [data-pill="all"],
.pills[data-active="active"] [data-pill="active"],
.pills[data-active="done"] [data-pill="done"] { background: #4f46e5; color: #fff; border-color: #4f46e5; }
ul { list-style: none; padding: 0; display: grid; gap: 0.4rem; }
li { padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 0.4rem; background: #fff; }
li[data-done="true"] { text-decoration: line-through; color: #9ca3af; }
/* Client-side filtering - CSS reacts to the list's data-filter */
#todo-list[data-filter="active"] li[data-done="true"] { display: none; }
#todo-list[data-filter="done"] li:not([data-done="true"]) { display: none; }
.add { display: flex; gap: 0.5rem; }
.add input { flex: 1; }
.stats { color: #6b7280; font-size: 0.9rem; }
.hsx-hidden { display: none; }
#toasts { position: fixed; bottom: 1rem; right: 1rem; display: grid; gap: 0.5rem; }
.toast { background: #111827; color: #fff; padding: 0.5rem 0.8rem; border-radius: 0.5rem; animation: toast-fade 3.5s forwards; }
@keyframes toast-fade { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }
`;

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Event Bus - HSX Example</title>
      <style>{STYLES}</style>
      <HsxBus debug />
    </head>
    <body>
      <main>
        <header>
          <h1>HSX client event bus</h1>
        </header>
        <p>
          Filter pills, the toast, and optimistic add all run in the browser
          with no round-trip. The server-pings counter is driven by the same
          filter-changed event through HTMX's from:body bridge.
        </p>

        <div
          class="row pills"
          data-active="all"
          on={events.filterChanged}
          act="set-attr data-active=$detail.filter"
        >
          <button
            data-pill="all"
            emit={events.filterChanged}
            emitDetail={{ filter: "all" }}
          >
            All
          </button>
          <button
            data-pill="active"
            emit={events.filterChanged}
            emitDetail={{ filter: "active" }}
          >
            Active
          </button>
          <button
            data-pill="done"
            emit={events.filterChanged}
            emitDetail={{ filter: "done" }}
          >
            Done
          </button>
        </div>

        <ul
          id="todo-list"
          data-filter="all"
          on={events.filterChanged}
          act="set-attr data-filter=$detail.filter"
        >
          <li data-done="false">Buy milk</li>
          <li data-done="true">Walk the dog</li>
          <li data-done="false">Write HSX docs</li>
          <li data-done="true">Ship the event bus</li>
        </ul>

        <div class="add">
          <input
            type="text"
            placeholder="Type a todo, press Enter..."
            autocomplete="off"
            emit={events.todoAdd}
            busTrigger="change"
          />
        </div>
        <ul
          id="opt-list"
          on={events.todoAdd}
          act="clone-template #todo-row-tpl into #opt-list as append"
        >
        </ul>

        <div class="row">
          <button
            class="toast-btn"
            emit={events.toast}
            emitDetail={{ message: "Saved!" }}
          >
            Show toast
          </button>
        </div>

        <div
          class="stats"
          get={Stats}
          trigger="filter-changed from:body"
          target={ids.stats}
          swap="innerHTML"
        >
          <span id="stats">Server pings: 0</span>
        </div>

        <div
          id="toasts"
          role="status"
          aria-live="polite"
          on={events.toast}
          act="clone-template #toast-tpl into #toasts as append"
        >
        </div>

        <template id="toast-tpl">
          <div class="toast" data-hsx-ttl="3500">
            <span data-hsx-slot="message"></span>
          </div>
        </template>
        <template id="todo-row-tpl">
          <li data-done="false">
            <span data-hsx-slot="value"></span>
          </li>
        </template>
      </main>
    </body>
  </html>
));

Deno.serve(async (req) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  if (req.method === "GET" && Stats.match(pathname)) return Stats.handle(req);

  if (pathname === "/static/htmx.js") {
    return serveAsset("../../vendor/htmx/htmx.js");
  }
  if (pathname === "/static/hsx-bus.js") {
    return serveAsset("../../packages/hsx/runtime/hsx-bus.js");
  }

  return new Response("Not found", { status: 404 });
});

async function serveAsset(relPath: string): Promise<Response> {
  try {
    const js = await Deno.readTextFile(new URL(relPath, import.meta.url));
    return new Response(js, {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  } catch {
    return new Response(`// asset not found: ${relPath}\n`, {
      status: 500,
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }
}
