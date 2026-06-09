/**
 * Todos Copilot Example
 *
 * A todo list with an AI copilot sidebar. The same hsxComponents serve both
 * the human (HTMX forms) and the agent (AI tool-calls). Ask the copilot to
 * add or toggle todos and watch the real list update live, driven by the
 * app's own endpoints - no parallel API.
 *
 * The same components are also exposed as an MCP server at /mcp, so external
 * MCP clients can operate the app:
 *   claude mcp add --transport http todos http://localhost:8000/mcp
 *
 * Run: ANTHROPIC_API_KEY=... deno task example:todos-copilot
 */

import { hsxPage } from "@srdjan/hsx";
import { createAppAgent } from "@srdjan/hsx-agent";
import { createConversationStore, createGenUIRoutes } from "@srdjan/hsx-genui";
import { claudeProvider } from "@srdjan/hsx-genui/claude";
import { createMcpHandler } from "@srdjan/hsx-mcp";
import {
  AddTodo,
  CopilotPanel,
  todoComponents,
  TodoListView,
} from "./components.tsx";

// =============================================================================
// Styles
// =============================================================================

const STYLES = `
:root { color-scheme: light dark; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  color: #1f2937;
  background: #f9fafb;
}
main { max-width: 60rem; margin: 0 auto; padding: 1.5rem; }
header h1 { font-size: 1.5rem; margin: 0 0 1rem; }
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}
.panel, .copilot {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
}
#todo-list { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; gap: 0.5rem; }
#todo-list li {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.625rem; border: 1px solid #eef0f3; border-radius: 0.5rem;
}
#todo-list li[data-empty] { color: #9ca3af; justify-content: center; }
#todo-list li[data-done="true"] .text { text-decoration: line-through; color: #9ca3af; }
.toggle, .add-btn, .copilot-send {
  border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f3f4f6;
  padding: 0.35rem 0.7rem; font: inherit; cursor: pointer;
}
.text { flex: 1; }
.add-form, .copilot-form { display: flex; gap: 0.5rem; }
.add-input, .copilot-input {
  flex: 1; padding: 0.5rem 0.7rem; border: 1px solid #d1d5db;
  border-radius: 0.5rem; font: inherit;
}
.add-btn, .copilot-send { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.copilot h2 { font-size: 1.1rem; margin: 0 0 0.25rem; }
.copilot p { color: #6b7280; font-size: 0.85rem; margin: 0 0 0.75rem; }
.messages {
  display: flex; flex-direction: column; gap: 0.5rem;
  min-height: 8rem; max-height: 24rem; overflow-y: auto; margin-bottom: 0.75rem;
}
.genui-user-message {
  align-self: flex-end; background: #4f46e5; color: #fff;
  padding: 0.4rem 0.7rem; border-radius: 0.9rem 0.9rem 0.2rem 0.9rem; max-width: 85%;
}
.agent-text p { margin: 0; line-height: 1.45; }
.agent-error { color: #dc2626; font-size: 0.85rem; }
.agent-result:empty { display: none; }
`;

// =============================================================================
// Page
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Todos Copilot - HSX Example</title>
      <style>{STYLES}</style>
    </head>
    <body>
      <main>
        <header>
          <h1>Todos Copilot</h1>
        </header>
        <div class="layout">
          <div class="panel">
            <TodoListView />
            <form class="add-form" post={AddTodo} swap="none">
              <input
                class="add-input"
                type="text"
                name="text"
                placeholder="New todo..."
                autocomplete="off"
              />
              <button class="add-btn" type="submit">Add</button>
            </form>
          </div>
          <CopilotPanel />
        </div>
      </main>
    </body>
  </html>
));

// =============================================================================
// Agent + chat plumbing
// =============================================================================

const agent = createAppAgent({
  components: todoComponents,
  provider: claudeProvider(),
});
const store = createConversationStore();
const { send, stream } = createGenUIRoutes({
  handler: agent,
  store,
  basePath: "/copilot",
});

// The same components, exposed to external MCP clients. Local demo only:
// pass `bearerToken` or `authorize` before mounting this anywhere public.
const mcp = createMcpHandler({
  components: todoComponents,
  serverName: "todos-copilot",
});

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  if (send.match(pathname)) return send.handle(req);
  if (stream.match(pathname)) return stream.handle(req);

  const mcpResponse = mcp.handle(req);
  if (mcpResponse) return mcpResponse;

  for (const component of todoComponents) {
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
      return new Response(
        "// htmx.js not found - copy HTMX into vendor/htmx/htmx.js\n",
        {
          status: 500,
          headers: { "content-type": "text/javascript; charset=utf-8" },
        },
      );
    }
  }

  return new Response("Not found", { status: 404 });
});
