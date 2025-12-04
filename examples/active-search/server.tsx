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
import { hsxComponent, hsxPage } from "@srdjan/hsx";
import { id } from "@srdjan/hsx";
import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx-styles";

// =============================================================================
// Sample Data
// =============================================================================

type Contact = { id: number; name: string; email: string; company: string };

const ids = {
  results: id("search-results"),
};

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

function searchContacts(query: string): Contact[] {
  if (!query) return contacts;
  const q = query.toLowerCase();
  return contacts.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.company.toLowerCase().includes(q)
  );
}

const Search = hsxComponent("/search", {
  methods: ["GET"],
  async handler(req) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    // small artificial delay for demo smoothness
    if (q) await new Promise((r) => setTimeout(r, 200));
    return { contacts: searchContacts(q), query: q };
  },
  render: ({ contacts, query }) => <SearchResults contacts={contacts} query={query} />,
});

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Active Search - HSX Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
    </head>
    <body>
      <main>
        <h1>Contact Search</h1>
        <div class="search-form">
          <span class="search-icon">🔍</span>
          <input
            type="search"
            name="q"
            placeholder="Search contacts..."
            get={Search}
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
));

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (url.pathname === "/") return Page.render();

  const components = [Search];
  for (const component of components) {
    const method = req.method as typeof component.methods[number];
    if (component.match(url.pathname) && component.methods.includes(method)) {
      return component.handle(req);
    }
  }

  if (url.pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(new URL("../../vendor/htmx/htmx.js", import.meta.url));
      return new Response(js, { headers: { "content-type": "text/javascript; charset=utf-8" } });
    } catch {
      return new Response("// htmx.js not found", { status: 500, headers: { "content-type": "text/javascript" } });
    }
  }

  if (url.pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, { headers: { "content-type": "text/css; charset=utf-8" } });
  }

  return new Response("Not found", { status: 404 });
});
