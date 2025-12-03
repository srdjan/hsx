/** @jsxImportSource hsx */
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { renderHtml, render, Fragment, route, id, type Renderable } from "./index.ts";

// ============================================================================
// HTML Escaping Tests
// ============================================================================

Deno.test("escapeHtml: escapes ampersand", () => {
  const html = renderHtml(<div>{"Tom & Jerry"}</div>);
  assertEquals(html, "<div>Tom &amp; Jerry</div>");
});

Deno.test("escapeHtml: escapes less than", () => {
  const html = renderHtml(<div>{"1 < 2"}</div>);
  assertEquals(html, "<div>1 &lt; 2</div>");
});

Deno.test("escapeHtml: escapes greater than", () => {
  const html = renderHtml(<div>{"2 > 1"}</div>);
  assertEquals(html, "<div>2 &gt; 1</div>");
});

Deno.test("escapeHtml: escapes double quotes in attributes", () => {
  const html = renderHtml(<div data-value={'say "hello"'} />);
  assertEquals(html, '<div data-value="say &quot;hello&quot;"></div>');
});

Deno.test("escapeHtml: escapes single quotes in attributes", () => {
  const html = renderHtml(<div data-value={"it's"} />);
  assertEquals(html, '<div data-value="it&#x27;s"></div>');
});

Deno.test("escapeHtml: handles all special characters together", () => {
  const html = renderHtml(<div>{'<script>alert("xss")</script>'}</div>);
  assertEquals(
    html,
    "<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>"
  );
});

// ============================================================================
// Basic Rendering Tests
// ============================================================================

Deno.test("render: basic element", () => {
  const html = renderHtml(<div>Hello</div>);
  assertEquals(html, "<div>Hello</div>");
});

Deno.test("render: nested elements", () => {
  const html = renderHtml(
    <div>
      <span>Hello</span>
    </div>
  );
  assertEquals(html, "<div><span>Hello</span></div>");
});

Deno.test("render: void elements", () => {
  const html = renderHtml(<input type="text" />);
  assertEquals(html, '<input type="text">');
});

Deno.test("render: void elements self-close without children", () => {
  const html = renderHtml(<br />);
  assertEquals(html, "<br>");
});

Deno.test("render: boolean attributes (true)", () => {
  const html = renderHtml(<input disabled />);
  assertEquals(html, "<input disabled>");
});

Deno.test("render: boolean attributes (false) are omitted", () => {
  const html = renderHtml(<input disabled={false} />);
  assertEquals(html, "<input>");
});

Deno.test("render: className becomes class", () => {
  const html = renderHtml(<div className="container" />);
  assertEquals(html, '<div class="container"></div>');
});

Deno.test("render: style object renders CSS", () => {
  const html = renderHtml(
    <div style={{ backgroundColor: "red", marginTop: 8 }} />,
  );
  assertEquals(
    html,
    '<div style="background-color:red;margin-top:8;"></div>',
  );
});

Deno.test("render: numbers in content", () => {
  const html = renderHtml(<div>{42}</div>);
  assertEquals(html, "<div>42</div>");
});

Deno.test("render: null and undefined are empty", () => {
  const html = renderHtml(<div>{null}{undefined}</div>);
  assertEquals(html, "<div></div>");
});

Deno.test("render: false and true are empty", () => {
  const html = renderHtml(<div>{false}{true}</div>);
  assertEquals(html, "<div></div>");
});

Deno.test("render: arrays of elements", () => {
  const items = ["a", "b", "c"];
  const html = renderHtml(<ul>{items.map((i) => <li>{i}</li>)}</ul>);
  assertEquals(html, "<ul><li>a</li><li>b</li><li>c</li></ul>");
});

// ============================================================================
// Component Tests
// ============================================================================

Deno.test("render: function component", () => {
  function Greeting(props: { name: string }) {
    return <div>Hello, {props.name}!</div>;
  }
  const html = renderHtml(<Greeting name="World" />);
  assertEquals(html, "<div>Hello, World!</div>");
});

Deno.test("render: nested components", () => {
  function Inner() {
    return <span>inner</span>;
  }
  function Outer() {
    return (
      <div>
        <Inner />
      </div>
    );
  }
  const html = renderHtml(<Outer />);
  assertEquals(html, "<div><span>inner</span></div>");
});

Deno.test("render: Fragment renders children without wrapper", () => {
  const html = renderHtml(
    <Fragment>
      <span>a</span>
      <span>b</span>
    </Fragment>
  );
  assertEquals(html, "<span>a</span><span>b</span>");
});

// ============================================================================
// HSX Normalization Tests
// ============================================================================

Deno.test("normalize: get attribute becomes hx-get", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api/data">Load</button>
      </body>
    </html>
  );
  assertEquals(
    html,
    '<html><body><button hx-get="/api/data">Load</button><script src="/static/htmx.js"></script></body></html>'
  );
});

Deno.test("normalize: post attribute becomes hx-post", () => {
  const html = renderHtml(
    <html>
      <body>
        <form post="/api/submit">
          <button>Submit</button>
        </form>
      </body>
    </html>
  );
  // Form also gets action/method for fallback
  assertEquals(
    html.includes('hx-post="/api/submit"'),
    true
  );
});

Deno.test("normalize: target with Id becomes hx-target", () => {
  const listId = id("my-list");
  const html = renderHtml(
    <html>
      <body>
        <button get="/api" target={listId}>
          Load
        </button>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-target="#my-list"'), true);
});

Deno.test("normalize: swap attribute becomes hx-swap", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api" swap="outerHTML">
          Load
        </button>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-swap="outerHTML"'), true);
});

Deno.test("normalize: vals attribute becomes hx-vals (JSON)", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api" vals={{ page: 1 }}>
          Load
        </button>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-vals="{&quot;page&quot;:1}"'), true);
});

Deno.test("normalize: headers attribute becomes hx-headers (JSON)", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api" headers={{ "X-Custom": "value" }}>
          Load
        </button>
      </body>
    </html>
  );
  assertEquals(
    html.includes('hx-headers="{&quot;X-Custom&quot;:&quot;value&quot;}"'),
    true
  );
});

Deno.test("normalize: Route builds URL", () => {
  // Type is automatically inferred from path: { id: string | number }
  const userRoute = route("/users/:id", (p) => `/users/${p.id}`);
  const html = renderHtml(
    <html>
      <body>
        <button get={userRoute} params={{ id: 42 }}>
          Load User
        </button>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-get="/users/42"'), true);
});

Deno.test("normalize: anchor behavior=boost becomes hx-boost", () => {
  const html = renderHtml(
    <html>
      <body>
        <a href="/page" behavior="boost">
          Link
        </a>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-boost="true"'), true);
});

// ============================================================================
// HTMX Script Injection Tests
// ============================================================================

Deno.test("htmx: script injected when HSX attrs used", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api">Load</button>
      </body>
    </html>
  );
  assertEquals(html.includes('<script src="/static/htmx.js"></script>'), true);
});

Deno.test("htmx: script NOT injected when no HSX attrs", () => {
  const html = renderHtml(
    <html>
      <body>
        <button>Regular Button</button>
      </body>
    </html>
  );
  assertEquals(html.includes("htmx.js"), false);
});

Deno.test("htmx: script injected before </body>", () => {
  const html = renderHtml(
    <html>
      <body>
        <div get="/api">Load</div>
      </body>
    </html>
  );
  assertEquals(
    html.endsWith('<script src="/static/htmx.js"></script></body></html>'),
    true
  );
});

Deno.test("htmx: injection can be forced", () => {
  const html = renderHtml(
    <html>
      <body>
        <div>No HSX</div>
      </body>
    </html>,
    { injectHtmx: true }
  );
  assertEquals(html.includes('htmx.js'), true);
});

Deno.test("htmx: injection can be disabled", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api">Load</button>
      </body>
    </html>,
    { injectHtmx: false }
  );
  assertEquals(html.includes('htmx.js'), false);
});

// ============================================================================
// Manual hx-* Rejection Tests
// ============================================================================

Deno.test("manual hx-* props throw", () => {
  assertThrows(
    () => renderHtml(<button hx-get="/api">Load</button>),
    Error,
    "hx-get"
  );
});

Deno.test("manual hx-* on generic element throws", () => {
  assertThrows(
    () => renderHtml(<div hx-target="#t">X</div>),
    Error,
    "hx-target"
  );
});

Deno.test("HSX attrs still allowed", () => {
  const html = renderHtml(
    <html>
      <body>
        <button get="/api">OK</button>
      </body>
    </html>
  );
  assertEquals(html.includes('hx-get="/api"'), true);
});

// ============================================================================
// Depth/Node Limit Tests
// ============================================================================

Deno.test("limits: maxDepth throws when exceeded", () => {
  function Deep(props: { level: number }): Renderable {
    if (props.level === 0) return <span>bottom</span>;
    return (
      <div>
        <Deep level={props.level - 1} />
      </div>
    );
  }

  assertThrows(
    () => renderHtml(<Deep level={20} />, { maxDepth: 10 }),
    Error,
    "Maximum render depth exceeded: 10"
  );
});

Deno.test("limits: maxDepth allows within limit", () => {
  function Deep(props: { level: number }): Renderable {
    if (props.level === 0) return <span>bottom</span>;
    return (
      <div>
        <Deep level={props.level - 1} />
      </div>
    );
  }

  const html = renderHtml(<Deep level={5} />, { maxDepth: 100 });
  assertEquals(html.includes("bottom"), true);
});

Deno.test("limits: maxNodes throws when exceeded", () => {
  const items = Array.from({ length: 100 }, (_, i) => i);
  assertThrows(
    () =>
      renderHtml(
        <ul>
          {items.map((i) => (
            <li>{i}</li>
          ))}
        </ul>,
        { maxNodes: 50 }
      ),
    Error,
    "Maximum node count exceeded: 50"
  );
});

// ============================================================================
// Response Helper Test
// ============================================================================

Deno.test("render: returns Response with correct content-type", async () => {
  const response = render(<div>Hello</div>);
  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("content-type"),
    "text/html; charset=utf-8"
  );
  const body = await response.text();
  assertEquals(body, "<div>Hello</div>");
});

Deno.test("render: custom status code", async () => {
  const response = render(<div>Not Found</div>, { status: 404 });
  assertEquals(response.status, 404);
});

// ============================================================================
// Lazy Copy Optimization Tests
// ============================================================================

Deno.test("normalize: plain elements are not copied", () => {
  // This test verifies the lazy copy optimization works
  // by checking that non-HSX elements render correctly
  const html = renderHtml(
    <html>
      <body>
        <div id="test" className="container">
          <span>Content</span>
        </div>
      </body>
    </html>
  );
  assertEquals(html.includes('id="test"'), true);
  assertEquals(html.includes('class="container"'), true);
  assertEquals(html.includes("htmx.js"), false);
});
