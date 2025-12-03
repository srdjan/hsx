/**
 * Shared UI wrapper components for cleaner JSX
 */
import type { HsxSwap, Urlish } from "../../src/hsx-types.ts";

export function Subtitle(props: { children: string }) {
  return <p class="subtitle">{props.children}</p>;
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
    <div class="card" get={props.get} trigger={props.trigger} swap={props.swap}>
      {props.title && <h2>{props.title}</h2>}
      {props.children}
    </div>
  );
}

export function UserList(props: { children: unknown }) {
  return (
    <ul class="user-list" id="user-list">
      {props.children}
    </ul>
  );
}
