/**
 * Shared UI wrapper components for cleaner JSX
 */
import type { HsxSwap, Urlish } from "@srdjan/hsx";

export function Subtitle(props: { children: string }) {
  return (
    <div class="subtitle">
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
    <div class="card" get={props.get} trigger={props.trigger} swap={props.swap}>
      {props.title && <h2>{props.title}</h2>}
      {props.children}
    </div>
  );
}

export function UserList(props: { children: unknown }) {
  return (
    <div class="user-list">
      <ul id="user-list">
        {props.children}
      </ul>
    </div>
  );
}
