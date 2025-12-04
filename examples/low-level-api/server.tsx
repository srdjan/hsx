/**
 * Low-Level API Example
 *
 * Demonstrates manual use of render/renderHtml without hsxPage/hsxComponent.
 */
import { id, render, renderHtml, route } from "../../src/index.ts";

const routes = {
  time: route("/time", () => "/time"),
  joke: route("/joke", () => "/joke"),
};

const ids = {
  output: id("output"),
};

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Low-Level HSX API</title>
        <style>
          {`
body { font-family: system-ui, sans-serif; margin: 2rem; }
main { max-width: 32rem; }
button { padding: 0.5rem 0.75rem; margin-right: 0.5rem; }
#output { margin-top: 1rem; padding: 1rem; border: 1px solid #ddd; min-height: 3rem; }
`}
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>Low-Level HSX API</h1>
          </header>
          <p>Directly using render/renderHtml and manual route handling.</p>
          <div>
            <button
              type="button"
              get={routes.time}
              target={ids.output}
              swap="innerHTML"
            >
              Show Time
            </button>
            <button
              type="button"
              get={routes.joke}
              target={ids.output}
              swap="innerHTML"
            >
              Tell Joke
            </button>
          </div>
          <div id="output">Click a button to load content.</div>
        </main>
      </body>
    </html>
  );
}

// Simple handlers
function handleTime(): Response {
  const now = new Date();
  const html = renderHtml(<div>The time is {now.toLocaleTimeString()}.</div>);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function handleJoke(): Response {
  const jokes = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "There are 10 kinds of people: those who understand binary and those who don’t.",
    "It’s not a bug, it’s an undocumented feature.",
  ];
  const pick = jokes[Math.floor(Math.random() * jokes.length)];
  const html = renderHtml(<div>{pick}</div>);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }
  if (url.pathname === "/") return render(<Page />);
  if (url.pathname === routes.time.path) return handleTime();
  if (url.pathname === routes.joke.path) return handleJoke();

  if (url.pathname === "/static/htmx.js") {
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
