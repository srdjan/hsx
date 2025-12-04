# HSX User Guide

A comprehensive guide to using HSX, the SSR-only JSX renderer for HTMX applications.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [HSX Attributes Reference](#hsx-attributes-reference)
4. [Type-Safe Routes](#type-safe-routes)
5. [HSX Components](#hsx-components)
6. [HSX Page](#hsx-page)
7. [Branded IDs](#branded-ids)
8. [HTMX Script Injection](#htmx-script-injection)
9. [Render Options](#render-options)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is HSX?

HSX is a server-side rendering (SSR) library for Deno that lets you write JSX with HTMX-style attributes. Instead of writing `hx-get`, `hx-post`, `hx-target`, etc., you write `get`, `post`, `target` as if they were native HTML attributes.

During rendering, HSX:
1. Walks your JSX tree
2. Converts HSX attributes to `hx-*` attributes
3. Automatically injects the HTMX script when needed
4. Returns plain HTML

### Why HSX?

- **Cleaner syntax** - `get="/todos"` instead of `hx-get="/todos"`
- **Type safety** - Routes and IDs are type-checked at compile time
- **Auto injection** - HTMX script is added only when needed
- **SSR-only** - No client runtime, just HTML

### The SSR-Only Philosophy

HSX has no client-side runtime. The browser never sees HSX attributes like `get`, `post`, or `target`. These exist only in your TypeScript/JSX code. After rendering, the browser receives:

- Standard HTML tags
- `hx-*` attributes (interpreted by HTMX)
- The HTMX script tag

---

## Getting Started

### Installation

**From JSR:**

```bash
deno add jsr:@srdjan/hsx
```

**Or import directly:**

```ts
import { render, route, id } from "jsr:@srdjan/hsx";
```

### JSX Configuration

Add to your `deno.json`:

```jsonc
{
  "imports": {
    "hsx/jsx-runtime": "jsr:@srdjan/hsx/jsx-runtime"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx",
    "lib": ["dom", "dom.iterable", "deno.ns"],
    "strict": true
  }
}
```

Or use the pragma in individual files:

```tsx
/** @jsxImportSource jsr:@srdjan/hsx */
```

### Serving HTMX

HSX injects `<script src="/static/htmx.js">` when HTMX is used. You must serve this file:

```ts
const handler = async (req: Request) => {
  const url = new URL(req.url);

  // Serve HTMX
  if (url.pathname === "/static/htmx.js") {
    const js = await Deno.readTextFile("./vendor/htmx/htmx.js");
    return new Response(js, {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }

  // Your routes...
  return render(<Page />);
};

Deno.serve(handler);
```

### Minimal Example

```tsx
/** @jsxImportSource jsr:@srdjan/hsx */
import { render, route, id } from "jsr:@srdjan/hsx";

const routes = {
  greet: route("/greet", () => "/greet"),
};

const ids = {
  message: id("message"),
};

function Page() {
  return (
    <html>
      <body>
        <button get={routes.greet} target={ids.message} swap="innerHTML">
          Say Hello
        </button>
        <div id="message">Click the button</div>
      </body>
    </html>
  );
}

Deno.serve(() => render(<Page />));
```

---

## HSX Attributes Reference

### HTTP Verb Attributes

These trigger HTMX requests:

| Attribute | Renders To | Description |
|-----------|------------|-------------|
| `get` | `hx-get` | GET request to fetch content |
| `post` | `hx-post` | POST request to submit data |
| `put` | `hx-put` | PUT request for full updates |
| `patch` | `hx-patch` | PATCH request for partial updates |
| `delete` | `hx-delete` | DELETE request to remove resources |

**Example:**

```tsx
<button get="/data">Load</button>
// Renders: <button hx-get="/data">Load</button>

<form post="/submit">...</form>
// Renders: <form hx-post="/submit">...</form>
```

### Targeting Attributes

Control where content goes:

| Attribute | Renders To | Description |
|-----------|------------|-------------|
| `target` | `hx-target` | CSS selector for target element |
| `swap` | `hx-swap` | How to swap content into target |

**Swap values:**

- `innerHTML` - Replace inner HTML (default)
- `outerHTML` - Replace entire element
- `beforebegin` - Insert before element
- `afterbegin` - Insert as first child
- `beforeend` - Insert as last child
- `afterend` - Insert after element
- `none` - No swap, just trigger events

**Example:**

```tsx
<button get="/items" target="#list" swap="innerHTML">
  Refresh List
</button>
// Renders: <button hx-get="/items" hx-target="#list" hx-swap="innerHTML">
```

### Event Attributes

Control when requests fire:

| Attribute | Renders To | Description |
|-----------|------------|-------------|
| `trigger` | `hx-trigger` | Event that triggers the request |

**Common trigger values:**

- `click` - On mouse click (default for buttons)
- `change` - On input value change
- `submit` - On form submission
- `load` - On page load
- `revealed` - When element enters viewport
- `every Ns` - Polling interval (e.g., `every 5s`)

**Example:**

```tsx
<div get="/status" trigger="every 10s" target="#status">
  Loading...
</div>
// Renders: <div hx-get="/status" hx-trigger="every 10s" hx-target="#status">

<input get="/search" trigger="keyup changed delay:300ms" target="#results" />
```

### Data Attributes

Send additional data with requests:

| Attribute | Renders To | Description |
|-----------|------------|-------------|
| `vals` | `hx-vals` | Additional values as JSON |
| `headers` | `hx-headers` | Custom request headers as JSON |

**Example:**

```tsx
<button
  get="/filter"
  vals={{ status: "active", page: 1 }}
  headers={{ "X-Custom": "value" }}
>
  Filter
</button>
// Renders:
// <button hx-get="/filter"
//         hx-vals='{"status":"active","page":1}'
//         hx-headers='{"X-Custom":"value"}'>
```

### Anchor-Specific Attributes

| Attribute | Renders To | Description |
|-----------|------------|-------------|
| `behavior="boost"` | `hx-boost="true"` | Enable HTMX boost on anchors |

**Example:**

```tsx
<a href="/page" behavior="boost">Link</a>
// Renders: <a href="/page" hx-boost="true">Link</a>
```

### Supported Elements

HSX attributes work on these elements:

- `form` - Forms with GET/POST
- `button` - Buttons for actions
- `a` - Links with boost
- `div`, `span` - Generic containers
- `section`, `article` - Semantic containers
- `ul`, `tbody`, `tr` - List and table elements

---

## Type-Safe Routes

### Creating Routes

Use `route()` to create type-safe routes:

```ts
import { route } from "jsr:@srdjan/hsx";

const routes = {
  home: route("/", () => "/"),
  users: {
    list: route("/users", () => "/users"),
    detail: route("/users/:id", (p) => `/users/${p.id}`),
  },
};
```

### Path Parameters

Parameters in the path (`:param`) are automatically extracted:

```ts
// Single parameter
const userRoute = route("/users/:id", (p) => `/users/${p.id}`);
// p is typed as { id: string | number }

// Multiple parameters
const postRoute = route(
  "/users/:userId/posts/:postId",
  (p) => `/users/${p.userId}/posts/${p.postId}`
);
// p is typed as { userId: string | number; postId: string | number }

// No parameters
const homeRoute = route("/", () => "/");
// Build function takes no parameters
```

### Using Routes in JSX

Pass routes directly to HSX attributes:

```tsx
<button get={routes.users.list}>Load Users</button>
// Renders: <button hx-get="/users">Load Users</button>

<button get={routes.users.detail} params={{ id: 42 }}>View User</button>
// Renders: <button hx-get="/users/42">View User</button>
```

### Route Organization

Organize routes in a separate file:

```ts
// routes.ts
import { route } from "jsr:@srdjan/hsx";

export const routes = {
  todos: {
    list: route("/todos", () => "/todos"),
    toggle: route("/todos/:id/toggle", (p) => `/todos/${p.id}/toggle`),
    delete: route("/todos/:id", (p) => `/todos/${p.id}`),
  },
  api: {
    search: route("/api/search", () => "/api/search"),
  },
};
```

## HSX Components

`hsxComponent()` co-locates a route, request handler, and render function. The handler's return type and the render props are tied together, so TypeScript prevents mismatches.

### Defining a Component

```ts
import { hsxComponent } from "jsr:@srdjan/hsx";

export const TodoList = hsxComponent("/todos", {
  methods: ["GET", "POST"], // defaults to ["GET"]

  async handler(req) {
    if (req.method === "POST") {
      const form = await req.formData();
      await addTodo(String(form.get("text")));
    }
    return { todos: await getTodos() }; // must match render props
  },

  render({ todos }) {
    return (
      <ul id="todo-list">
        {todos.map((t) => (
          <li key={t.id}>{t.text}</li>
        ))}
      </ul>
    );
  },
});
```

### Using in JSX and on the Server

- In JSX: `<form post={TodoList} target="#todo-list" swap="outerHTML" />`
- As a route matcher: `TodoList.match(pathname)` returns params or `null`
- As a handler: `return TodoList.handle(req)` renders the fragment (or full page)

### Full Page vs Fragment

Set `fullPage: true` when your render function outputs a complete HTML document. The default (`fullPage: false`) returns just the rendered fragment with `content-type: text/html; charset=utf-8`.

`methods` controls which HTTP verbs the component responds to; it defaults to `GET`.

---

## HSX Page

`hsxPage()` wraps a render function that returns a **full HTML document** and validates it for semantic cleanliness:

- Root must be `<html>` containing `<head>` followed by `<body>`
- Semantic tags (`header`, `main`, `section`, `article`, `footer`, headings, lists, etc.) may **not** have `class` or inline `style`
- `<style>` tags must live inside `<head>` (put your CSS there)
- Composition is limited to semantic HTML, standard document tags, and HSX components

```tsx
import { hsxPage, hsxComponent } from "jsr:@srdjan/hsx";

const Stats = hsxComponent("/stats", {
  handler: () => ({ total: 42 }),
  render: ({ total }) => <p>Total: {total}</p>,
});

export const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <title>Guarded Layout</title>
      <style>{"body { font-family: system-ui; }"}</style>
    </head>
    <body>
      <header><h1>Dashboard</h1></header>
      <main>
        <section>
          <div class="card">
            <Stats.Component />
          </div>
        </section>
      </main>
    </body>
  </html>
));

// Usage: render(<Page.Component />) or Page.render();
```

Violations throw descriptive errors (e.g., "Semantic element <section> cannot have a class").

---

## Branded IDs

### Creating IDs

Use `id()` to create type-safe element references:

```ts
import { id } from "jsr:@srdjan/hsx";

const ids = {
  list: id("todo-list"),      // Type: Id<"todo-list">
  count: id("item-count"),    // Type: Id<"item-count">
  form: id("add-form"),       // Type: Id<"add-form">
};

// The value is "#todo-list", "#item-count", etc.
```

### Using IDs

Use IDs in both the element and target:

```tsx
// Define the element
<ul id="todo-list">...</ul>

// Reference it in target
<button get="/todos" target={ids.list}>Refresh</button>
// Renders: <button hx-get="/todos" hx-target="#todo-list">
```

### Type Safety Benefits

The branded type ensures you can't accidentally use a plain string where an ID is expected:

```ts
const ids = { list: id("todo-list") };

// This works:
<button target={ids.list}>...</button>

// This also works (string is allowed):
<button target="#other-element">...</button>

// The benefit: ids.list is typed as Id<"todo-list">,
// catching typos at compile time
```

### ID Organization

Organize IDs in a separate file:

```ts
// ids.ts
import { id } from "jsr:@srdjan/hsx";

export const ids = {
  app: id("app"),
  todoList: id("todo-list"),
  todoCount: id("todo-count"),
  filters: id("filters"),
};
```

---

## HTMX Script Injection

### Auto-Injection Behavior

HSX automatically injects the HTMX script when any HSX attribute is used:

```tsx
// This triggers injection:
<button get="/data">Load</button>

// Rendered HTML includes:
// <script src="/static/htmx.js"></script>
```

The script is injected just before `</body>`.

### Manual Control

Force injection even without HSX attributes:

```tsx
render(<Page />, { injectHtmx: true });
```

Suppress injection when you bundle HTMX yourself:

```tsx
render(<Page />, { injectHtmx: false });
```

### Custom HTMX Path

The injection path is `/static/htmx.js`. If you need a different path, suppress auto-injection and add the script manually:

```tsx
render(<Page />, { injectHtmx: false });

// In your JSX:
<script src="/my/custom/path/htmx.min.js"></script>
```

---

## Render Options

### `render(node, options?)`

Returns an HTTP `Response`:

```ts
interface RenderOptions {
  status?: number;        // HTTP status code (default: 200)
  headers?: HeadersInit;  // Additional response headers
  maxDepth?: number;      // Max nesting depth
  maxNodes?: number;      // Max node count
  injectHtmx?: boolean;   // Force/suppress HTMX injection
}

// Example:
render(<Page />, {
  status: 200,
  headers: { "X-Custom": "header" },
  maxDepth: 100,
  maxNodes: 50000,
});
```

### `renderHtml(node, options?)`

Returns an HTML string:

```ts
interface RenderHtmlOptions {
  maxDepth?: number;
  maxNodes?: number;
  injectHtmx?: boolean;
}

const html = renderHtml(<Page />, { maxDepth: 100 });
```

### DoS Protection

Use limits to prevent denial-of-service attacks:

```ts
// Prevent deeply nested structures (stack overflow)
render(<Page />, { maxDepth: 100 });

// Prevent extremely large trees (memory exhaustion)
render(<Page />, { maxNodes: 50000 });
```

Recommended production values:
- `maxDepth: 100` - Sufficient for any reasonable HTML
- `maxNodes: 50000` - Allows large pages without abuse

---

## Best Practices

### Organize Routes and IDs

Keep routes and IDs in separate files:

```
src/
  routes.ts   # All route definitions
  ids.ts      # All ID definitions
  components/ # Your components
```

### Use Type-Safe Routes

Avoid hardcoding URLs:

```tsx
// Bad:
<button get="/users/123">View</button>

// Good:
<button get={routes.users.detail} params={{ id: 123 }}>View</button>
```

### Partial Updates

Design endpoints to return HTML fragments:

```tsx
// Full page endpoint
app.get("/", () => render(<FullPage />));

// Partial update endpoint
app.get("/todos", () => renderHtml(<TodoList todos={todos} />));
```

### Security Guidelines

1. **Never pass user input to script/style tags:**
   ```tsx
   // DANGEROUS:
   <script>{userInput}</script>

   // Safe - these are escaped:
   <div>{userInput}</div>
   ```

2. **Validate all route parameters:**
   ```ts
   const id = parseInt(params.id);
   if (isNaN(id)) return new Response("Invalid ID", { status: 400 });
   ```

3. **Use DoS protection in production:**
   ```ts
   render(<Page />, { maxDepth: 100, maxNodes: 50000 });
   ```

### Performance Tips

1. **Keep components simple** - HSX is SSR-only, so every request renders fresh
2. **Use partial updates** - Return only the HTML that changed
3. **Leverage HTMX triggers** - Use `delay:` and `throttle:` modifiers

---

## Troubleshooting

### Common Errors

**"Manual hx-* attributes are not allowed"**

HSX throws if you use `hx-*` attributes directly:

```tsx
// Error:
<button hx-get="/data">Load</button>

// Fix - use HSX attribute:
<button get="/data">Load</button>
```

**"Maximum render depth exceeded"**

You have infinite recursion or very deep nesting:

```tsx
// Check for infinite loops:
function Bad() {
  return <Bad />; // Infinite recursion!
}

// Or increase the limit if legitimately needed:
render(<Page />, { maxDepth: 200 });
```

**"Maximum node count exceeded"**

You're rendering too many elements:

```tsx
// Check for accidental large arrays
// Or increase the limit:
render(<Page />, { maxNodes: 100000 });
```

**HTMX not working**

1. Check that you're serving `/static/htmx.js`
2. Verify the HTMX file exists at `./vendor/htmx/htmx.js`
3. Check browser console for 404 errors

### TypeScript Errors

**"Property 'get' does not exist on type..."**

Ensure your deno.json has the correct JSX configuration:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hsx"
  }
}
```

**Route parameter type mismatch**

Ensure your params match the path:

```ts
// Path has :id
const route = route("/users/:id", (p) => `/users/${p.id}`);

// Params must include id
<button get={route} params={{ id: 123 }}>View</button>
```

### Debug Tips

1. **Check rendered HTML** - Use `renderHtml()` and log the output
2. **Verify HTMX loading** - Check Network tab in browser DevTools
3. **Test endpoints directly** - Curl your endpoints to see raw HTML
4. **Enable HTMX logging** - Add `htmx.logAll()` in browser console
