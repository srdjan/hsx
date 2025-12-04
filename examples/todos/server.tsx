/**
 * Todos Example
 *
 * Demonstrates hsxComponent pattern with hsxPage for the main layout.
 * Components are defined in components.tsx.
 */
import { hsxPage } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";
import {
  TodoApp,
  TodoList,
  TodoToggle,
  TodoDelete,
  TodoClear,
  todos,
} from "./components.tsx";

// =============================================================================
// Page
// =============================================================================

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Todos - HSX Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <main>
        <header>
          <h1>todos</h1>
        </header>

        <TodoApp items={todos} filter="all" />
      </main>
    </body>
  </html>
));

// =============================================================================
// Server
// =============================================================================

const components = [TodoList, TodoToggle, TodoDelete, TodoClear];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  if (pathname === "/") {
    return Page.render();
  }

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
      return new Response(
        "// htmx.js not found - copy HTMX v2 into vendor/htmx/htmx.js\n",
        {
          status: 500,
          headers: { "content-type": "text/javascript; charset=utf-8" },
        },
      );
    }
  }

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
});
