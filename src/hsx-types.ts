/**
 * HSX core types: type-safe routes, branded element IDs, and HTMX swap/trigger modes.
 * @module hsx-types
 */

// =============================================================================
// Path Parameter Extraction Types
// =============================================================================

/**
 * Extract parameter names from a path template (up to 5 segments).
 * Matches `:paramName` patterns and extracts `paramName`.
 *
 * @example
 * ```ts
 * type P1 = PathParams<"/users/:id">; // "id"
 * type P2 = PathParams<"/users/:userId/posts/:postId">; // "userId" | "postId"
 * type P3 = PathParams<"/static/page">; // never
 * ```
 */
type PathParams<Path extends string> =
  // Match paths with up to 5 segments to avoid infinite recursion
  Path extends `/${infer A}/${infer B}/${infer C}/${infer D}/${infer E}`
    ?
      | ExtractSingle<A>
      | ExtractSingle<B>
      | ExtractSingle<C>
      | ExtractSingle<D>
      | ExtractSingle<E>
    : Path extends `/${infer A}/${infer B}/${infer C}/${infer D}`
      ?
        | ExtractSingle<A>
        | ExtractSingle<B>
        | ExtractSingle<C>
        | ExtractSingle<D>
    : Path extends `/${infer A}/${infer B}/${infer C}`
      ? ExtractSingle<A> | ExtractSingle<B> | ExtractSingle<C>
    : Path extends `/${infer A}/${infer B}`
      ? ExtractSingle<A> | ExtractSingle<B>
    : Path extends `/${infer A}` ? ExtractSingle<A>
    : never;

/** Extract param name from a single segment */
type ExtractSingle<S extends string> = S extends `:${infer P}` ? P : never;

/**
 * Create a params object type from extracted parameter names.
 * Each parameter becomes a required property with `string | number` value.
 *
 * @example
 * ```ts
 * type P = ParamsFromPath<"/users/:id/posts/:postId">;
 * // { id: string | number; postId: string | number }
 * ```
 */
export type ParamsFromPath<Path extends string> = [PathParams<Path>] extends
  [never] ? Record<string, never>
  : { [K in PathParams<Path>]: string | number };

/**
 * A type-safe route definition with path template and URL builder.
 * Automatically extracts path parameters from the path template.
 *
 * @typeParam Path - The URL path template (e.g., "/users/:id")
 * @typeParam Params - The parameters required to build the URL (inferred from path)
 *
 * @example
 * ```ts
 * const userRoute: Route<"/users/:id"> = {
 *   path: "/users/:id",
 *   build: (p) => `/users/${p.id}` // p is typed as { id: string | number }
 * };
 * ```
 */
export type Route<
  Path extends string,
  Params = ParamsFromPath<Path>,
> = {
  /** The URL path template */
  path: Path;
  /** Function to build the final URL from parameters */
  build: (params: Params) => string;
};

/**
 * Create a type-safe route with path template and URL builder.
 * Path parameters are automatically extracted from the path string.
 *
 * @param path - The URL path template (e.g., "/users/:id")
 * @param build - Function to build the final URL from parameters
 * @returns A Route object for use in JSX attributes
 *
 * @example
 * ```ts
 * // Parameters automatically inferred from path:
 * const routes = {
 *   users: {
 *     list: route("/users", () => "/users"),
 *     detail: route("/users/:id", (p) => `/users/${p.id}`), // p.id is string | number
 *     posts: route("/users/:userId/posts/:postId", (p) => `/users/${p.userId}/posts/${p.postId}`),
 *   }
 * };
 *
 * // In JSX:
 * <button get={routes.users.detail} params={{ id: 42 }}>View User</button>
 * // Renders: <button hx-get="/users/42">View User</button>
 * ```
 *
 * @example
 * ```ts
 * // Type error: missing required parameter
 * const badRoute = route("/users/:id", (p) => `/users/${p.name}`);
 * //                                              ~~~~~~ Error: 'name' doesn't exist on { id: string | number }
 * ```
 */
export function route<Path extends string>(
  path: Path,
  build: (params: ParamsFromPath<Path>) => string,
): Route<Path, ParamsFromPath<Path>> {
  return { path, build };
}

/**
 * A branded element ID type that ensures CSS selector format (#name).
 *
 * @typeParam Name - The element ID name (without the # prefix)
 *
 * @example
 * ```ts
 * const listId: Id<"todo-list"> = id("todo-list");
 * // Type: "#todo-list" (branded)
 * ```
 */
export type Id<Name extends string> = `#${Name}` & { readonly __idBrand: Name };

/**
 * Create a branded element ID for use in HSX target attributes.
 *
 * @param name - The element ID name (without the # prefix)
 * @returns A branded Id string prefixed with #
 *
 * @example
 * ```ts
 * const ids = {
 *   list: id("todo-list"),
 *   form: id("todo-form"),
 * };
 *
 * // In JSX:
 * <ul id="todo-list">...</ul>
 * <button get="/todos" target={ids.list}>Refresh</button>
 * // Renders: <button hx-get="/todos" hx-target="#todo-list">Refresh</button>
 * ```
 */
export function id<Name extends string>(name: Name): Id<Name> {
  return (`#${name}` as unknown) as Id<Name>;
}

/**
 * HTMX swap strategies for replacing content.
 * Maps to the hx-swap attribute.
 *
 * - `innerHTML` - Replace inner HTML of target element (default)
 * - `outerHTML` - Replace entire target element
 * - `beforebegin` - Insert before target element
 * - `afterbegin` - Insert as first child of target
 * - `beforeend` - Insert as last child of target
 * - `afterend` - Insert after target element
 * - `none` - No swap, just trigger events
 *
 * @see https://htmx.org/attributes/hx-swap/
 */
export type HsxSwap =
  | "innerHTML"
  | "outerHTML"
  | "beforebegin"
  | "afterbegin"
  | "beforeend"
  | "afterend"
  | "none";

/**
 * HTMX trigger events that initiate requests.
 * Maps to the hx-trigger attribute.
 *
 * Common values:
 * - `click` - On mouse click
 * - `change` - On input value change
 * - `submit` - On form submission
 * - `revealed` - When element enters viewport
 * - `load` - On page load
 * - `every Ns` - Polling interval (e.g., "every 5s")
 *
 * Also accepts any valid HTMX trigger string.
 *
 * @see https://htmx.org/attributes/hx-trigger/
 */
export type HsxTrigger =
  | "click"
  | "change"
  | "submit"
  | "revealed"
  | "load"
  | `every ${number}s`
  | (string & {});

/**
 * A URL-like value: either a string or a typed Route.
 * Uses `any` for Route params to allow variance in JSX attributes.
 */
// deno-lint-ignore no-explicit-any
export type Urlish = string | Route<string, any>;

/** Parameters for route building */
export type Params = Record<string, unknown>;
