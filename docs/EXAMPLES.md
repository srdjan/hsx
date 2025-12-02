# Examples

HSX includes several examples demonstrating different HTMX patterns. Run any example with:

```bash
deno task example:<name>
```

---

## Todos

**Command:** `deno task example:todos`
**Port:** 8000
**File:** `examples/todos/server.tsx`

A full CRUD todo application demonstrating:

- SSR full page rendering at `/`
- Partial updates via HTMX endpoints
- Type-safe routes and IDs
- Filter functionality (all, active, completed)
- Clear completed action

**Key patterns:**

```tsx
<form
  post={routes.todos.list}
  target={ids.list}
  swap="outerHTML"
  headers={{ "X-Flow-Id": "todos-example" }}
>
  <input name="text" required />
  <button type="submit">Add</button>
</form>

<button
  type="button"
  get={routes.todos.list}
  target={ids.list}
  swap="outerHTML"
  vals={{ status: "all" }}
>
  Refresh
</button>
```

---

## Active Search

**Command:** `deno task example:active-search`
**Port:** 8001
**File:** `examples/active-search/server.tsx`

Live search that filters results as you type:

- Search input with debounced trigger
- Result highlighting
- Keyboard-driven search

**Key patterns:**

```tsx
<input
  type="search"
  name="q"
  get={routes.search}
  target={ids.results}
  trigger="keyup changed delay:300ms"
  swap="innerHTML"
/>
```

---

## Lazy Loading

**Command:** `deno task example:lazy-loading`
**Port:** 8002
**File:** `examples/lazy-loading/server.tsx`

Deferred content loading patterns:

- Load on reveal (infinite scroll)
- Load on page load
- Skeleton loaders

**Key patterns:**

```tsx
// Load when element enters viewport
<div get="/content" trigger="revealed" swap="outerHTML">
  <Skeleton />
</div>

// Load immediately on page load
<div get="/data" trigger="load" swap="innerHTML">
  Loading...
</div>
```

---

## Form Validation

**Command:** `deno task example:form-validation`
**Port:** 8003
**File:** `examples/form-validation/server.tsx`

Server-side form validation:

- Per-field validation on blur
- Real-time error messages
- Validation on form submission

**Key patterns:**

```tsx
<input
  name="email"
  type="email"
  get={routes.validate.email}
  target={ids.emailError}
  trigger="blur changed"
  swap="innerHTML"
/>
<span id="email-error"></span>
```

---

## Polling

**Command:** `deno task example:polling`
**Port:** 8004
**File:** `examples/polling/server.tsx`

Live updates with polling:

- Dashboard with auto-refreshing stats
- Activity feed with new items
- Configurable polling intervals

**Key patterns:**

```tsx
<div
  get="/stats"
  target={ids.stats}
  swap="innerHTML"
  trigger="every 2s"
>
  <Stats />
</div>

<div
  get="/activity"
  trigger="every 5s"
  swap="afterbegin"
>
  {/* New items appear at top */}
</div>
```

---

## Tabs & Modal

**Command:** `deno task example:tabs-modal`
**Port:** 8005
**File:** `examples/tabs-modal/server.tsx`

Tab navigation and modal dialogs:

- Tab switching with partial updates
- Modal open/close patterns
- Multiple targets

**Key patterns:**

```tsx
// Tab navigation
<button get={routes.tab} params={{ id: "users" }} target={ids.content}>
  Users
</button>

// Modal trigger
<button get="/modal" target={ids.modal} swap="innerHTML">
  Open Modal
</button>
```

---

## Running Examples

1. Clone the repository
2. Run the desired example:
   ```bash
   deno task example:todos
   ```
3. Open the URL shown in the console (e.g., http://localhost:8000)

Each example is self-contained with its own:
- `server.tsx` - Main server and components
- `routes.ts` - Type-safe route definitions
- `ids.ts` - Branded element ID definitions
