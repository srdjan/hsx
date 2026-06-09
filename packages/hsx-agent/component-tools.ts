/**
 * componentsToTools - derive AI tool definitions from agent-callable components.
 *
 * Mirrors the widget-catalog's tool generation, but the source is an
 * `hsxComponent`'s `.agent` descriptor rather than a widget. Components
 * without an `.agent` descriptor (no `describe`/`input`) are skipped, so
 * the same component list can mix human-only and agent-exposed routes.
 *
 * @module component-tools
 */

import type { ToolDefinition } from "@srdjan/hsx-widgets";
import type { AgentComponent } from "./types.ts";

/**
 * Build tool definitions for every agent-callable component in the list.
 *
 * @throws if two components resolve to the same tool name.
 */
export function componentsToTools(
  components: ReadonlyArray<AgentComponent>,
): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  const seen = new Set<string>();

  for (const component of components) {
    const agent = component.agent;
    if (!agent) continue;

    if (seen.has(agent.name)) {
      throw new Error(`Duplicate agent tool name: ${agent.name}`);
    }
    seen.add(agent.name);

    tools.push({
      name: agent.name,
      description: agent.description,
      parameters: agent.schema,
    });
  }

  return tools;
}
