/**
 * GenUI Chat Components - Pre-built HSX components for chat interfaces.
 *
 * Provides route handlers that wire up HTMX + SSE plumbing for a
 * generative UI chat interface. The send route renders the user bubble
 * and an SSE-connected div; the stream route returns the AI's SSE response.
 *
 * @module components
 */

import { hsxComponent } from "@srdjan/hsx/components";
import type { Renderable } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";
import type { GenUIHandler } from "./handler.ts";
import type { ConversationStore } from "./conversation.ts";
import { createConversation } from "./conversation.ts";

// =============================================================================
// Types
// =============================================================================

export type GenUIChatOptions = {
  readonly handler: GenUIHandler;
  readonly store: ConversationStore;
  /** Base path for all GenUI routes. Defaults to "/genui". */
  readonly basePath?: string;
};

/** Minimal route interface for GenUI routes. */
export type GenUIRoute = {
  readonly handle: (req: Request) => Promise<Response>;
  readonly match: (pathname: string) => Record<string, string> | null;
};

export type GenUIRoutes = {
  /** GET basePath - renders the chat page shell */
  readonly page: GenUIRoute;
  /** POST basePath/send - accepts user input, renders user bubble with SSE div */
  readonly send: GenUIRoute;
  /** GET basePath/stream/:id - SSE endpoint returning AI response stream */
  readonly stream: GenUIRoute;
};

// =============================================================================
// Chat Styles
// =============================================================================

const CHAT_STYLES = `
.genui-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 48rem;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
}
.genui-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.genui-input-form {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--border, #e5e7eb);
}
.genui-input {
  flex: 1;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  background: var(--surface, #ffffff);
  color: var(--text, #1f2937);
}
.genui-input:focus {
  outline: none;
  border-color: var(--primary, #4f46e5);
}
.genui-submit {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  background: var(--primary, #4f46e5);
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}
.genui-submit:hover {
  opacity: 0.9;
}
.genui-user-message {
  align-self: flex-end;
  background: var(--primary, #4f46e5);
  color: #ffffff;
  padding: 0.5rem 0.875rem;
  border-radius: 1rem 1rem 0.25rem 1rem;
  max-width: 80%;
}
.genui-text p {
  margin: 0;
  line-height: 1.5;
}
.genui-widget {
  width: 100%;
}
.genui-error {
  color: #dc2626;
  font-size: 0.875rem;
  padding: 0.5rem;
}
`;

// =============================================================================
// Public API
// =============================================================================

/**
 * Create routes for a complete GenUI chat interface.
 *
 * Returns three routes:
 * - `page`: GET - renders the chat shell
 * - `send`: POST - accepts user messages, renders user bubble with SSE div
 * - `stream`: GET - SSE endpoint returning AI response stream
 *
 * @example
 * ```ts
 * const { page, send, stream } = createGenUIRoutes({ handler, store });
 *
 * Deno.serve((req) => {
 *   const { pathname } = new URL(req.url);
 *   if (page.match(pathname)) return page.handle(req);
 *   if (send.match(pathname)) return send.handle(req);
 *   if (stream.match(pathname)) return stream.handle(req);
 *   return new Response("Not Found", { status: 404 });
 * });
 * ```
 */
export function createGenUIRoutes(
  options: GenUIChatOptions,
): GenUIRoutes {
  const { handler, store } = options;
  const basePath = options.basePath ?? "/genui";

  const page = hsxComponent(basePath, {
    methods: ["GET"],
    handler(_req: Request) {
      return {};
    },
    render(): Renderable {
      return (
        <div class="genui-chat">
          <style>{CHAT_STYLES}</style>
          <div id="genui-messages" class="genui-messages">
          </div>
          <form
            class="genui-input-form"
            post={`${basePath}/send`}
            target="#genui-messages"
            swap="beforeend"
          >
            <input
              class="genui-input"
              type="text"
              name="message"
              placeholder="Ask something..."
              autocomplete="off"
            />
            <button class="genui-submit" type="submit">Send</button>
          </form>
        </div>
      );
    },
  });

  const send = hsxComponent(`${basePath}/send`, {
    methods: ["POST"],
    async handler(req: Request) {
      const formData = await req.formData();
      const message = formData.get("message");
      const conversationId = formData.get("conversation_id");

      const userMessage = typeof message === "string" ? message.trim() : "";
      const convId = typeof conversationId === "string"
        ? conversationId
        : undefined;

      let conversation = convId ? store.get(convId) : undefined;
      if (!conversation) {
        conversation = createConversation();
      }

      conversation = conversation.append({
        role: "user",
        content: userMessage,
      });
      store.set(conversation.id, conversation);

      return { userMessage, conversationId: conversation.id };
    },
    render(
      { userMessage, conversationId }: {
        userMessage: string;
        conversationId: string;
      },
    ): Renderable {
      return (
        <div>
          <div class="genui-user-message">{userMessage}</div>
          <div
            ext="sse"
            sseConnect={`${basePath}/stream/${conversationId}`}
            sseSwap="message"
            swap="beforeend"
          >
          </div>
        </div>
      );
    },
  });

  // SSE stream endpoint - returns AI response as Server-Sent Events.
  // This is a raw route handler, not an hsxComponent, because it returns
  // an SSE response rather than rendered HTML.
  const streamRoute: GenUIRoute = {
    match(pathname: string): Record<string, string> | null {
      const prefix = `${basePath}/stream/`;
      if (!pathname.startsWith(prefix)) return null;
      const id = pathname.slice(prefix.length);
      if (!id || id.includes("/")) return null;
      return { id };
    },

    async handle(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const params = streamRoute.match(url.pathname);
      if (!params) {
        return new Response("Not Found", { status: 404 });
      }

      const conversation = store.get(params.id);
      if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
      }

      // Find the last user message to send to the AI
      const msgs = conversation.messages;
      let lastUserMsg: typeof msgs[number] | undefined;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
          lastUserMsg = msgs[i];
          break;
        }
      }

      if (!lastUserMsg) {
        return new Response("No user message", { status: 400 });
      }

      // Get history (all messages except the last user message)
      const history = conversation.messages.slice(0, -1);

      return handler.handleMessage(lastUserMsg.content, history);
    },
  };

  return { page, send, stream: streamRoute };
}
