/**
 * Active Search Example
 *
 * Demonstrates HSX features:
 * - `get` attribute for AJAX requests
 * - `trigger` with modifiers (keyup, changed, delay)
 * - `target` with branded IDs
 * - `swap` strategies
 * - `vals` for passing additional data
 * - CSS indicator class for loading states
 */
import { render, renderHtml } from "../../src/index.ts";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

// =============================================================================
// Sample Data
// =============================================================================

type Contact = { id: number; name: string; email: string; company: string };

const contacts: Contact[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", company: "Acme Corp" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", company: "Tech Inc" },
  { id: 3, name: "Carol Williams", email: "carol@example.com", company: "Acme Corp" },
  { id: 4, name: "David Brown", email: "david@example.com", company: "Startup LLC" },
  { id: 5, name: "Eva Martinez", email: "eva@example.com", company: "Tech Inc" },
  { id: 6, name: "Frank Lee", email: "frank@example.com", company: "Big Corp" },
  { id: 7, name: "Grace Chen", email: "grace@example.com", company: "Startup LLC" },
  { id: 8, name: "Henry Wilson", email: "henry@example.com", company: "Big Corp" },
];

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root { --accent: #4f46e5; --bg: #f8fafc; --surface: #fff; --border: #e2e8f0; --text: #1e293b; --muted: #64748b; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 40rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 1.5rem; color: var(--muted); }

/* Search input with indicator */
.search-form { position: relative; margin-bottom: 1rem; }
.search-form input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; font-size: 1rem; border: 2px solid var(--border); border-radius: 8px; transition: border-color 0.2s; }
.search-form input:focus { outline: none; border-color: var(--accent); }
.search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--muted); }

/* Loading indicator - shown when htmx-request class is present */
.indicator { display: none; position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); }
.htmx-request .indicator { display: inline-block; }
.spinner { width: 1.25rem; height: 1.25rem; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Results table */
table { width: 100%; background: var(--surface); border-radius: 8px; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
th { font-weight: 600; color: var(--muted); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--bg); }
.no-results { padding: 2rem; text-align: center; color: var(--muted); }
mark { background: #fef08a; padding: 0.1em 0.2em; border-radius: 2px; }
`;

// =============================================================================
// Components
// =============================================================================

function SearchResults(props: { contacts: Contact[]; query: string }) {
  const { contacts, query } = props;

  if (contacts.length === 0) {
    return <div class="no-results">No contacts found for "{query}"</div>;
  }

  // Highlight matching text
  const highlight = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part) =>
      part.toLowerCase() === query.toLowerCase() ? <mark>{part}</mark> : part
    );
  };

  return (
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Company</th></tr></thead>
      <tbody>
        {contacts.map((c) => (
          <tr>
            <td>{highlight(c.name)}</td>
            <td>{highlight(c.email)}</td>
            <td>{highlight(c.company)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Active Search - HSX Example</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <h1>Contact Search</h1>
          {/* Search input with HTMX active search pattern */}
          {/* trigger="keyup changed delay:300ms" - fires on keyup, only if value changed, with 300ms debounce */}
          <div class="search-form">
            <span class="search-icon">🔍</span>
            <input
              type="search"
              name="q"
              placeholder="Search contacts..."
              get={routes.search}
              trigger="keyup changed delay:300ms, search"
              target={ids.results}
              swap="innerHTML"
              autofocus
            />
            <span class="indicator"><span class="spinner" /></span>
          </div>
          <div id="search-results">
            <SearchResults contacts={contacts} query="" />
          </div>
        </main>
      </body>
    </html>
  );
}

// =============================================================================
// Server
// =============================================================================

function searchContacts(query: string): Contact[] {
  if (!query) return contacts;
  const q = query.toLowerCase();
  return contacts.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.company.toLowerCase().includes(q)
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (url.pathname === "/") return render(<Page />);
  if (url.pathname === "/search") {
    const q = url.searchParams.get("q") ?? "";
    // Simulate network delay for demo purposes
    await new Promise((r) => setTimeout(r, 200));
    return new Response(renderHtml(<SearchResults contacts={searchContacts(q)} query={q} />), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(new URL("../../vendor/htmx/htmx.js", import.meta.url));
      return new Response(js, { headers: { "content-type": "text/javascript; charset=utf-8" } });
    } catch {
      return new Response("// htmx.js not found", { status: 500, headers: { "content-type": "text/javascript" } });
    }
  }
  return new Response("Not found", { status: 404 });
});

