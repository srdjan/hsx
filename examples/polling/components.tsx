/**
 * Shared UI wrapper components for cleaner JSX
 */
import type { HsxSwap, Urlish } from "@srdjan/hsx";

export function Subtitle(props: { children: string }) {
  return (
    <div data-ui="prose">
      <p>{props.children}</p>
    </div>
  );
}

export function Card(
  props: {
    children: unknown;
    title?: string;
    get?: Urlish;
    trigger?: string;
    swap?: HsxSwap;
  },
) {
  return (
    <div
      data-surface="card"
      data-layout="stack"
      data-gap="4"
      get={props.get}
      trigger={props.trigger}
      swap={props.swap}
    >
      {props.title && <h2>{props.title}</h2>}
      {props.children}
    </div>
  );
}

export function UserList(props: { children: unknown }) {
  return (
    <ul id="user-list" data-layout="stack" data-gap="2">{props.children}</ul>
  );
}
