/**
 * HSX GenUI - Generative UI for HSX applications.
 *
 * Build chat interfaces where AI models render interactive widgets
 * from a pre-registered catalog. Structured widgets with validated
 * props are the primary mode; raw HTML is available as an escape hatch.
 *
 * @example
 * ```ts
 * import { createGenUIHandler, createGenUIRoutes, createConversationStore } from "@srdjan/hsx-genui";
 * import { createCatalog } from "@srdjan/hsx-widgets";
 * import { claudeProvider } from "@srdjan/hsx-genui/claude";
 *
 * const catalog = createCatalog([weatherWidget, chartWidget]);
 * const handler = createGenUIHandler({
 *   catalog,
 *   provider: claudeProvider({ model: "claude-sonnet-4-6" }),
 * });
 * const store = createConversationStore();
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
 *
 * @module
 */

// AI Provider port
export type { AIProvider, Message, StreamEvent, ToolCall } from "./provider.ts";

// GenUI handler
export {
  createGenUIHandler,
  type GenUIHandler,
  type GenUIHandlerOptions,
} from "./handler.ts";

// Conversation state
export {
  type Conversation,
  type ConversationStore,
  type ConversationStoreOptions,
  createConversation,
  createConversationStore,
} from "./conversation.ts";

// Pre-built chat components
export {
  createGenUIRoutes,
  type GenUIChatOptions,
  type GenUIRoute,
  type GenUIRoutes,
} from "./components.tsx";
