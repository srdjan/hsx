/**
 * GenUI Handler - AI conversation loop with widget rendering.
 *
 * Orchestrates the flow: user message -> AI response -> tool calls ->
 * widget renders -> SSE stream. The handler is stateless; conversation
 * history is passed in per request.
 *
 * @module handler
 */

import { encodeSSEFrame, createSSEResponse, escapeHtml } from "@srdjan/hsx/core";
import type {
  WidgetCatalog,
  ToolDefinition,
} from "@srdjan/hsx-widgets";
import { formatForAI, createDesignGuidelines } from "@srdjan/hsx-widgets";
import type { AIProvider, Message, StreamEvent } from "./provider.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for creating a GenUI handler. */
export type GenUIHandlerOptions = {
  readonly catalog: WidgetCatalog;
  readonly provider: AIProvider;
  readonly systemPrompt?: string;
  /** Include design guidelines in system prompt. Default: true. */
  readonly includeGuidelines?: boolean;
  /** Maximum agentic loop turns before stopping. Default: 10. */
  readonly maxTurns?: number;
};

/** The GenUI handler interface. */
export type GenUIHandler = {
  readonly handleMessage: (
    userMessage: string,
    history: ReadonlyArray<Message>,
  ) => Response;
  readonly tools: ReadonlyArray<ToolDefinition>;
};

// =============================================================================
// HTML Rendering Helpers
// =============================================================================

function wrapHtml(className: string, inner: string): string {
  return `<div class="${className}">${inner}</div>`;
}

function renderTextChunk(text: string): string {
  return wrapHtml("genui-text", `<p>${escapeHtml(text)}</p>`);
}

function renderWidgetHtml(html: string): string {
  return wrapHtml("genui-widget", html);
}

function renderErrorChunk(message: string): string {
  return wrapHtml("genui-error", `<p>Error: ${escapeHtml(message)}</p>`);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a GenUI handler that orchestrates AI conversations with widget tools.
 *
 * Streams AI responses via SSE, renders widget tool calls through the catalog,
 * and feeds tool results back to the AI for multi-turn conversations.
 */
export function createGenUIHandler(
  options: GenUIHandlerOptions,
): GenUIHandler {
  const { catalog, provider } = options;
  const maxTurns = options.maxTurns ?? 10;
  const includeGuidelines = options.includeGuidelines ?? true;

  const systemParts: string[] = [];
  if (options.systemPrompt) {
    systemParts.push(options.systemPrompt);
  }
  systemParts.push(
    "You are a UI assistant. When appropriate, use the available widget tools to render interactive UI components. " +
    "Each tool renders a specific widget. Call the tool with the required props and the widget will be displayed to the user.",
  );
  if (includeGuidelines) {
    const guidelines = createDesignGuidelines();
    systemParts.push(formatForAI(guidelines));
  }
  const systemPrompt = systemParts.join("\n\n");

  const tools = catalog.toTools();

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
              const pendingToolCalls: Array<{
                id: string;
                name: string;
                arguments: Record<string, unknown>;
                renderOk: boolean;
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
                    const result = catalog.render(call.name, call.arguments);

                    // Cache render success/failure to avoid re-rendering in done handler
                    pendingToolCalls.push({ ...call, renderOk: result.ok });

                    if (result.ok) {
                      controller.enqueue(
                        encodeSSEFrame("message", renderWidgetHtml(result.value)),
                      );
                    } else {
                      const errorMsg =
                        result.error.tag === "unknown_widget"
                          ? `Unknown widget: ${result.error.widgetTag}`
                          : result.error.message;
                      controller.enqueue(
                        encodeSSEFrame("message", renderErrorChunk(errorMsg)),
                      );
                    }
                    break;
                  }

                  case "done": {
                    if (pendingToolCalls.length > 0) {
                      messages.push({
                        role: "assistant",
                        content: textAccumulator,
                        toolCalls: pendingToolCalls,
                      });

                      for (const tc of pendingToolCalls) {
                        messages.push({
                          role: "tool_result",
                          toolCallId: tc.id,
                          content: tc.renderOk
                            ? `Widget "${tc.name}" rendered successfully.`
                            : `Widget "${tc.name}" render failed.`,
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
            const message =
              error instanceof Error ? error.message : String(error);
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
