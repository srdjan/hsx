/**
 * AI Provider Port - Minimal interface for AI model interaction.
 *
 * Defines the contract that AI providers (Claude, OpenAI, etc.) implement
 * to participate in the GenUI conversation loop. Provider-agnostic by design.
 *
 * @module provider
 */

import type { ToolDefinition } from "@srdjan/hsx-widgets";

// =============================================================================
// Message Types
// =============================================================================

/** A message in the conversation history. */
export type Message =
  | { readonly role: "user"; readonly content: string }
  | {
    readonly role: "assistant";
    readonly content: string;
    readonly toolCalls?: ReadonlyArray<ToolCall>;
  }
  | { readonly role: "system"; readonly content: string }
  | {
    readonly role: "tool_result";
    readonly toolCallId: string;
    readonly content: string;
  };

/** A tool call made by the AI model. */
export type ToolCall = {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
};

// =============================================================================
// Stream Events
// =============================================================================

/** Events emitted during a streaming AI response. */
export type StreamEvent =
  | { readonly tag: "text"; readonly content: string }
  | { readonly tag: "tool_call"; readonly call: ToolCall }
  | { readonly tag: "done" };

// =============================================================================
// Provider Port
// =============================================================================

/**
 * Port interface for AI model providers.
 *
 * Implement this for each AI provider (Claude, OpenAI, etc.).
 * The provider translates between the GenUI protocol and
 * the provider's native API.
 *
 * @example
 * ```ts
 * const provider: AIProvider = {
 *   stream: async function*(messages, tools) {
 *     // Call AI API, yield StreamEvents
 *     yield { tag: "text", content: "Here's a chart:" };
 *     yield { tag: "tool_call", call: { id: "1", name: "hsx-chart", arguments: { ... } } };
 *     yield { tag: "done" };
 *   }
 * };
 * ```
 */
export type AIProvider = {
  /** Stream a response given messages and available tools. */
  readonly stream: (
    messages: ReadonlyArray<Message>,
    tools: ReadonlyArray<ToolDefinition>,
  ) => AsyncIterable<StreamEvent>;
};
