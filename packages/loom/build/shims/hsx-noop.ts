/**
 * HSX No-Op Shim - Stubs for SSR-only exports in embed context.
 *
 * When widgets are compiled for client-side embedding (via Preact),
 * imports from @srdjan/hsx are aliased to this module. All functions
 * throw because they should never be called client-side.
 *
 * @module hsx-noop
 */

function ssrOnly(name: string): never {
  throw new Error(`${name}() is SSR-only and cannot be called in embed context`);
}

// Core exports
export function render(): never { return ssrOnly("render"); }
export function renderHtml(): never { return ssrOnly("renderHtml"); }
export function route(): never { return ssrOnly("route"); }
export function id(): never { return ssrOnly("id"); }
export function Fragment(): null { return null; }

// Component exports
export function hsxComponent(): never { return ssrOnly("hsxComponent"); }
export function hsxPage(): never { return ssrOnly("hsxPage"); }

// Type re-exports (types are erased at compile time, these are for completeness)
export type Renderable = unknown;
export type VNode = unknown;
export type Route<_P extends string, _Params = unknown> = { path: _P; build: (params: _Params) => string };
export type HsxComponent<_P extends string, _Params = unknown, _Props = unknown> = unknown;
