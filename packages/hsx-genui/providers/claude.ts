/**
 * Claude Provider Adapter - Anthropic SDK integration.
 *
 * Converts between the GenUI AIProvider protocol and the Anthropic
 * Messages API. Handles streaming, tool use, and tool result round-trips.
 *
 * @module providers/claude
 */

import type { ToolDefinition } from "@srdjan/hsx-widgets";
import type { AIProvider, Message, StreamEvent } from "../provider.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for creating a Claude provider. */
export type ClaudeProviderOptions = {
  /** Anthropic API key. Read from ANTHROPIC_API_KEY env var if not provided. */
  readonly apiKey?: string;
  /** Model to use. Defaults to "claude-sonnet-4-6". */
  readonly model?: string;
  /** Maximum tokens in the response. Defaults to 4096. */
  readonly maxTokens?: number;
  /** Anthropic API base URL. Defaults to "https://api.anthropic.com". */
  readonly baseUrl?: string;
};

// =============================================================================
// Anthropic API Types (minimal subset)
// =============================================================================

type AnthropicMessage = {
  readonly role: "user" | "assistant";
  readonly content: string | ReadonlyArray<AnthropicContentBlock>;
};

type AnthropicContentBlock =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "tool_use";
      readonly id: string;
      readonly name: string;
      readonly input: Record<string, unknown>;
    }
  | {
      readonly type: "tool_result";
      readonly tool_use_id: string;
      readonly content: string;
    };

type AnthropicTool = {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
};

type AnthropicStreamEvent =
  | { readonly type: "content_block_start"; readonly index: number; readonly content_block: AnthropicContentBlock }
  | { readonly type: "content_block_delta"; readonly index: number; readonly delta: AnthropicDelta }
  | { readonly type: "content_block_stop"; readonly index: number }
  | { readonly type: "message_start"; readonly message: Record<string, unknown> }
  | { readonly type: "message_delta"; readonly delta: Record<string, unknown> }
  | { readonly type: "message_stop" }
  | { readonly type: "ping" };

type AnthropicDelta =
  | { readonly type: "text_delta"; readonly text: string }
  | { readonly type: "input_json_delta"; readonly partial_json: string };

// =============================================================================
// Message Conversion
// =============================================================================

function convertMessages(
  messages: ReadonlyArray<Message>,
): { system: string | undefined; messages: AnthropicMessage[] } {
  let system: string | undefined;
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system = msg.content;
      continue;
    }

    if (msg.role === "tool_result") {
      // Tool results go as user messages with tool_result content blocks
      anthropicMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.toolCallId,
            content: msg.content,
          },
        ],
      });
      continue;
    }

    if (msg.role === "assistant" && "toolCalls" in msg && msg.toolCalls) {
      // Assistant messages with tool calls
      const content: AnthropicContentBlock[] = [];
      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }
      anthropicMessages.push({ role: "assistant", content });
      continue;
    }

    // At this point, role is "user" or "assistant" (system and tool_result handled above)
    if (msg.role === "user" || msg.role === "assistant") {
      anthropicMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return { system, messages: anthropicMessages };
}

function convertTools(
  tools: ReadonlyArray<ToolDefinition>,
): AnthropicTool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

// =============================================================================
// SSE Stream Parser
// =============================================================================

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncIterable<AnthropicStreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentData = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        currentData += line.slice(6);
      } else if (line === "" && currentData) {
        try {
          yield JSON.parse(currentData) as AnthropicStreamEvent;
        } catch {
          // Skip malformed events
        }
        currentData = "";
      }
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create an AIProvider backed by the Anthropic Messages API.
 *
 * Uses raw fetch + SSE parsing rather than the Anthropic SDK to
 * avoid a heavy dependency. Compatible with the streaming Messages API.
 *
 * @example
 * ```ts
 * const provider = claudeProvider({
 *   apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
 *   model: "claude-sonnet-4-6",
 * });
 * ```
 */
export function claudeProvider(options: ClaudeProviderOptions = {}): AIProvider {
  const apiKey = options.apiKey ?? Deno.env.get("ANTHROPIC_API_KEY");
  const model = options.model ?? "claude-sonnet-4-6";
  const maxTokens = options.maxTokens ?? 4096;
  const baseUrl = options.baseUrl ?? "https://api.anthropic.com";

  if (!apiKey) {
    throw new Error(
      "Anthropic API key required. Set ANTHROPIC_API_KEY env var or pass apiKey option.",
    );
  }

  return {
    async *stream(
      messages: ReadonlyArray<Message>,
      tools: ReadonlyArray<ToolDefinition>,
    ): AsyncIterable<StreamEvent> {
      const { system, messages: anthropicMessages } = convertMessages(messages);
      const anthropicTools = convertTools(tools);

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        stream: true,
      };

      if (system) {
        body.system = system;
      }

      if (anthropicTools.length > 0) {
        body.tools = anthropicTools;
      }

      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Anthropic API error ${response.status}: ${errorText}`,
        );
      }

      if (!response.body) {
        throw new Error("No response body from Anthropic API");
      }

      const reader = response.body.getReader();

      let currentToolId = "";
      let currentToolName = "";
      let toolJsonChunks: string[] = [];
      let emittedDone = false;

      for await (const event of parseSSEStream(reader)) {
        switch (event.type) {
          case "content_block_start": {
            const block = event.content_block;
            if (block.type === "tool_use") {
              currentToolId = block.id;
              currentToolName = block.name;
              toolJsonChunks = [];
            }
            break;
          }

          case "content_block_delta": {
            if (event.delta.type === "text_delta") {
              yield { tag: "text", content: event.delta.text };
            } else if (event.delta.type === "input_json_delta") {
              toolJsonChunks.push(event.delta.partial_json);
            }
            break;
          }

          case "content_block_stop": {
            if (currentToolId && currentToolName) {
              const jsonStr = toolJsonChunks.join("") || "{}";
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(jsonStr);
              } catch {
                // Malformed JSON - use empty args
              }
              yield {
                tag: "tool_call",
                call: {
                  id: currentToolId,
                  name: currentToolName,
                  arguments: args,
                },
              };
              currentToolId = "";
              currentToolName = "";
              toolJsonChunks = [];
            }
            break;
          }

          case "message_stop": {
            emittedDone = true;
            yield { tag: "done" };
            break;
          }
        }
      }

      // Fallback: emit done if stream ended without message_stop
      if (!emittedDone) {
        yield { tag: "done" };
      }
    },
  };
}
