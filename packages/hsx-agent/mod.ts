/**
 * HSX Agent - make your HSX application agent-operable.
 *
 * Every `hsxComponent` that declares `describe` + `input` becomes an AI tool
 * from the same definition that serves humans over HTMX. An app agent drives
 * those real endpoints in a multi-turn loop and streams the resulting HTML -
 * the exact fragments a user would see - back to the browser over SSE.
 *
 * @example
 * ```ts
 * import { createAppAgent } from "@srdjan/hsx-agent";
 * import { claudeProvider } from "@srdjan/hsx-genui/claude";
 *
 * const agent = createAppAgent({
 *   components: [AddTodo, ToggleTodo, ClearDone],
 *   provider: claudeProvider({ model: "claude-sonnet-4-6" }),
 * });
 *
 * // In an SSE route handler:
 * return agent.handleMessage(userMessage, history);
 * ```
 *
 * @module
 */

export {
  type AppAgent,
  type AppAgentOptions,
  createAppAgent,
} from "./app-agent.ts";
export { componentsToTools } from "./component-tools.ts";
export { toRequest } from "./request-build.ts";
export type { AgentComponent } from "./types.ts";
