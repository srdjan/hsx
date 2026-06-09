/**
 * createAppAgent - let an AI drive the application's real hsxComponents.
 *
 * Where the GenUI handler renders inert display widgets, this runs the app's
 * own agent-callable components: each AI tool call is turned into a Request
 * (via toRequest), served by the component's own handle(), and the resulting
 * HTML - the exact fragment a human would receive over HTMX - is both streamed
 * to the browser and fed back to the model as its observation.
 *
 * The loop, SSE framing, and multi-turn structure mirror createGenUIHandler;
 * only the tool-call case differs.
 *
 * @module app-agent
 */

import {
  createSSEResponse,
  encodeSSEFrame,
  escapeHtml,
} from "@srdjan/hsx/core";
import type { ToolDefinition } from "@srdjan/hsx-widgets";
import type { AIProvider, Message } from "@srdjan/hsx-genui";
import { componentsToTools } from "./component-tools.ts";
import { toRequest } from "./request-build.ts";
import type { AgentComponent } from "./types.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for creating an app agent. */
export type AppAgentOptions = {
  /** The components the agent may call. Only those with an `.agent` descriptor are exposed. */
  readonly components: ReadonlyArray<AgentComponent>;
  /** The AI provider (e.g. claudeProvider) - the same port the GenUI handler uses. */
  readonly provider: AIProvider;
  /** Base origin for synthesized requests. Default: "http://localhost". */
  readonly origin?: string;
  /** Extra system prompt prepended before the built-in instructions. */
  readonly systemPrompt?: string;
  /** Maximum agentic loop turns before stopping. Default: 10. */
  readonly maxTurns?: number;
  /** Max characters of result HTML fed back to the model per tool call. Default: 4096. */
  readonly observationCap?: number;
};

/** The app agent interface. */
export type AppAgent = {
  readonly handleMessage: (
    userMessage: string,
    history: ReadonlyArray<Message>,
  ) => Response;
  readonly tools: ReadonlyArray<ToolDefinition>;
};

// =============================================================================
// HTML / observation helpers
// =============================================================================

function wrapHtml(className: string, inner: string): string {
  return `<div class="${className}">${inner}</div>`;
}

function renderTextChunk(text: string): string {
  return wrapHtml("agent-text", `<p>${escapeHtml(text)}</p>`);
}

function renderResultHtml(html: string): string {
  return wrapHtml("agent-result", html);
}

function renderErrorChunk(message: string): string {
  return wrapHtml("agent-error", `<p>Error: ${escapeHtml(message)}</p>`);
}

/** The text the model sees back: status line plus the (capped) rendered HTML. */
function projectObservation(status: number, html: string, cap: number): string {
  const trimmed = html.length > cap
    ? `${html.slice(0, cap)}\n...[truncated]`
    : html;
  return `HTTP ${status}\n${trimmed}`;
}

// =============================================================================
// Public API
// =============================================================================

const DEFAULT_SYSTEM_PROMPT =
  "You operate a web application by calling its tools. Each tool performs a real " +
  "action and returns the resulting HTML, which is shown to the user. Call tools to " +
  "fulfil the user's request, then briefly confirm what you did.";

/**
 * Create an app agent that exposes agent-callable components as AI tools and
 * drives them in a multi-turn loop, streaming results over SSE.
 */
export function createAppAgent(options: AppAgentOptions): AppAgent {
  const { components, provider } = options;
  const origin = options.origin ?? "http://localhost";
  const maxTurns = options.maxTurns ?? 10;
  const observationCap = options.observationCap ?? 4096;

  const systemPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${DEFAULT_SYSTEM_PROMPT}`
    : DEFAULT_SYSTEM_PROMPT;

  const tools = componentsToTools(components);
  const byName = new Map<string, AgentComponent>();
  for (const component of components) {
    if (component.agent) byName.set(component.agent.name, component);
  }

  return {
    tools,

    handleMessage(
      userMessage: string,
      history: ReadonlyArray<Message>,
    ): Response {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const messages: Message[] = [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "user", content: userMessage },
            ];

            let turns = 0;
            let continueLoop = true;

            while (continueLoop && turns < maxTurns) {
              turns++;
              continueLoop = false;

              let textAccumulator = "";
              const pending: Array<{
                id: string;
                name: string;
                observation: string;
              }> = [];

              for await (const event of provider.stream(messages, tools)) {
                switch (event.tag) {
                  case "text": {
                    textAccumulator += event.content;
                    controller.enqueue(
                      encodeSSEFrame("message", renderTextChunk(event.content)),
                    );
                    break;
                  }

                  case "tool_call": {
                    const { call } = event;
                    const component = byName.get(call.name);

                    if (!component) {
                      const msg = `Unknown tool: ${call.name}`;
                      controller.enqueue(
                        encodeSSEFrame("message", renderErrorChunk(msg)),
                      );
                      pending.push({
                        id: call.id,
                        name: call.name,
                        observation: msg,
                      });
                      break;
                    }

                    try {
                      const req = toRequest(component, call.arguments, origin);
                      const res = await component.handle(req);
                      const html = await res.text();
                      controller.enqueue(
                        encodeSSEFrame("message", renderResultHtml(html)),
                      );
                      pending.push({
                        id: call.id,
                        name: call.name,
                        observation: projectObservation(
                          res.status,
                          html,
                          observationCap,
                        ),
                      });
                    } catch (error) {
                      const msg = error instanceof Error
                        ? error.message
                        : String(error);
                      controller.enqueue(
                        encodeSSEFrame("message", renderErrorChunk(msg)),
                      );
                      pending.push({
                        id: call.id,
                        name: call.name,
                        observation: `Error: ${msg}`,
                      });
                    }
                    break;
                  }

                  case "done": {
                    if (pending.length > 0) {
                      messages.push({
                        role: "assistant",
                        content: textAccumulator,
                        toolCalls: pending.map((p) => ({
                          id: p.id,
                          name: p.name,
                          arguments: {},
                        })),
                      });
                      for (const p of pending) {
                        messages.push({
                          role: "tool_result",
                          toolCallId: p.id,
                          content: p.observation,
                        });
                      }
                      continueLoop = true;
                    }
                    break;
                  }
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error
              ? error.message
              : String(error);
            controller.enqueue(
              encodeSSEFrame("error", JSON.stringify({ error: message })),
            );
          } finally {
            controller.close();
          }
        },
      });

      return createSSEResponse(stream);
    },
  };
}
