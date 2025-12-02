// HSX core types: routes, branded ids, and semantic attributes.

export type Route<Path extends string, Params> = {
  path: Path;
  build: (params: Params) => string;
};

export function route<Path extends string, Params>(
  path: Path,
  build: (params: Params) => string,
): Route<Path, Params> {
  return { path, build };
}

export type Id<Name extends string> =
  `#${Name}` & { readonly __idBrand: Name };

export function id<Name extends string>(name: Name): Id<Name> {
  return (`#${name}` as unknown) as Id<Name>;
}

export type HsxSwap =
  | "innerHTML"
  | "outerHTML"
  | "beforebegin"
  | "afterbegin"
  | "beforeend"
  | "afterend"
  | "none";

export type HsxTrigger =
  | "click"
  | "change"
  | "submit"
  | "revealed"
  | "load"
  | `every ${number}s`
  | (string & {});

export type Urlish = string | Route<string, any>;
export type Params = Record<string, unknown>;
