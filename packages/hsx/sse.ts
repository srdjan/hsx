/**
 * Server-Sent Events rendering support for HSX.
 *
 * Produces SSE responses from async iterables of Renderable values,
 * compatible with HTMX's SSE extension for streaming widget updates.
 *
 * @module sse
 */

import type { Renderable } from "./jsx-runtime.ts";
import { renderHtml, type RenderHtmlOptions } from "./render.ts";

// =============================================================================
// Types
// =============================================================================

/** Options for SSE response generation. */
export type SSEOptions = {
  /** SSE event name. Defaults to "message". */
  readonly event?: string;
  /** Render options passed through to renderHtml. */
  readonly renderOptions?: RenderHtmlOptions;
};

// =============================================================================
// SSE Encoding
// =============================================================================

const TEXT_ENCODER = new TextEncoder();

/**
 * Encode an SSE frame from event name and data string.
 * Multi-line data is split into multiple `data:` lines per SSE spec.
 */
export function encodeSSEFrame(event: string, data: string): Uint8Array {
  const lines: string[] = [];
  lines.push(`event: ${event}`);
  for (const line of data.split("\n")) {
    lines.push(`data: ${line}`);
  }
  lines.push("", ""); // blank line terminates the frame
  return TEXT_ENCODER.encode(lines.join("\n"));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render an async iterable of Renderable values as a Server-Sent Events response.
 *
 * Each yielded Renderable is rendered to HTML via renderHtml() and emitted
 * as an SSE data frame. Pairs with HTMX's SSE extension:
 *
 * ```tsx
 * <div ext="sse" sseConnect="/stream" sseSwap="message">
 *   {/* widgets appear here as SSE events arrive *\/}
 * </div>
 * ```
 *
 * @param chunks - Async iterable producing Renderable values
 * @param options - SSE and render options
 * @returns HTTP Response with Content-Type: text/event-stream
 */
export function renderSSE(
  chunks: AsyncIterable<Renderable>,
  options: SSEOptions = {},
): Response {
  const event = options.event ?? "message";
  const renderOpts = options.renderOptions ?? {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const html = renderHtml(chunk, renderOpts);
          if (html.length > 0) {
            controller.enqueue(encodeSSEFrame(event, html));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encodeSSEFrame("error", JSON.stringify({ error: message })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return createSSEResponse(stream);
}

/** Create an HTTP Response with SSE headers from a ReadableStream. */
export function createSSEResponse(
  stream: ReadableStream<Uint8Array>,
): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}
