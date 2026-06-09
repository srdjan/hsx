/**
 * Shared types for @srdjan/hsx-agent.
 *
 * @module types
 */

import type { AgentDescriptor, HttpMethod } from "@srdjan/hsx";

/**
 * The structural subset of an HsxComponent that the agent runner needs.
 *
 * Any concrete `hsxComponent(...)` satisfies this: `build`/`handle` use
 * method syntax (bivariant), so their concrete parameter types are
 * assignable here without resorting to `any`. The agent only ever reads
 * `agent`, `path`, `methods`, `build`, and `handle`.
 */
export type AgentComponent = {
  readonly path: string;
  readonly methods: readonly HttpMethod[];
  readonly agent?: AgentDescriptor;
  build(params: Record<string, unknown>): string;
  handle(req: Request): Promise<Response>;
};
