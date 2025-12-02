/** @jsxImportSource ../../src */
import { render } from "../../src/index.ts";

type WidgetBoot = {
  tenantId: string;
  candidateId: string;
  locale: string;
};

function JsonScript(props: { id: string; data: unknown }) {
  const json = JSON.stringify(props.data)
    .replace(/</g, "\u003c");
  return (
    <script
      type="application/json"
      id={props.id}
      dangerouslySetInnerHTML={json as any}
    />
  );
}

function IdentityWidgetShell(props: { boot: WidgetBoot }) {
  return (
    <html>
      <head>
        <title>Identity Flow</title>
        <meta charSet="utf-8" />
      </head>
      <body>
        <h1>Hosted identity flow</h1>
        <p>Tenant: {props.boot.tenantId}</p>
        <p>Candidate: {props.boot.candidateId}</p>
        <div id="identity-root">
          <p>Loading widget…</p>
        </div>
        <JsonScript id="identity-boot" data={props.boot} />
        <script src="/static/identity-widget.js" defer></script>
      </body>
    </html>
  );
}

Deno.serve((req) => {
  const url = new URL(req.url);

  if (url.pathname === "/hosted/identity") {
    const boot: WidgetBoot = {
      tenantId: "tenant-123",
      candidateId: "cand-456",
      locale: "en-US",
    };
    return render(<IdentityWidgetShell boot={boot} />);
  }

  if (url.pathname === "/static/identity-widget.js") {
    const js = `
      (function(){
        const el = document.getElementById("identity-boot");
        if (!el) return;
        try {
          const data = JSON.parse(el.textContent || "{}");
          const root = document.getElementById("identity-root");
          if (root) {
            root.innerHTML = "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
          }
        } catch (e) {
          console.error("Failed to parse identity boot JSON", e);
        }
      }());
    `;
    return new Response(js, {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
});
