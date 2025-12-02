# HSX Overview

HSX is a small, opinionated JSX/TSX renderer for **server-side rendering
only**. It treats HTMX-style interactions as if they were a natural part
of HTML, then compiles them to `hx-*` attributes on the server.

## Goals

- **Ergonomic authoring**: JSX should feel like HTML from a future
  where HTMX semantics (`get`, `post`, `target`, `swap`, `trigger`,
  `vals`, `headers`) are part of the spec.
- **SSR-only**: no client-side HSX runtime; the browser sees only HTML +
  `hx-*` attributes and an HTMX script.
- **Typed routes & IDs**: routes and target element references should be
  type-safe.
- **HTMX as implementation detail**: you never write `hx-` manually or
  add the HTMX `<script>` tag yourself.
