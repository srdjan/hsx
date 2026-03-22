/**
 * Conversation State - In-memory conversation management.
 *
 * Provides an append-only conversation model and an in-memory store
 * with configurable max size and TTL eviction.
 *
 * @module conversation
 */

import type { Message } from "./provider.ts";

// =============================================================================
// Types
// =============================================================================

/** An append-only conversation with message history. */
export type Conversation = {
  readonly id: string;
  readonly messages: ReadonlyArray<Message>;
  readonly append: (message: Message) => Conversation;
};

export type ConversationStoreOptions = {
  /** Maximum stored conversations. Oldest evicted when exceeded. Default: 1000. */
  readonly maxSize?: number;
  /** TTL in milliseconds. Conversations expire after last access. Default: 1800000 (30 min). */
  readonly ttlMs?: number;
};

export type ConversationStore = {
  readonly get: (id: string) => Conversation | undefined;
  readonly set: (id: string, conversation: Conversation) => void;
  readonly delete: (id: string) => void;
};

// =============================================================================
// Conversation Factory
// =============================================================================

/**
 * Create a conversation. Uses a mutable backing array internally
 * for O(1) append; exposes ReadonlyArray for safety.
 */
export function createConversation(
  id?: string,
  messages?: ReadonlyArray<Message>,
): Conversation {
  const conversationId = id ?? crypto.randomUUID();
  const msgs: Message[] = messages ? [...messages] : [];

  const conversation: Conversation = {
    id: conversationId,
    get messages(): ReadonlyArray<Message> {
      return msgs;
    },
    append(message: Message): Conversation {
      msgs.push(message);
      return conversation;
    },
  };

  return conversation;
}

// =============================================================================
// In-Memory Store
// =============================================================================

type StoreEntry = {
  conversation: Conversation;
  lastAccessed: number;
};

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Create an in-memory conversation store with max size and TTL eviction.
 *
 * - On `get()`: returns undefined if expired (lazy eviction)
 * - On `set()`: evicts oldest entry if over maxSize
 */
export function createConversationStore(
  options?: ConversationStoreOptions,
): ConversationStore {
  const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const store = new Map<string, StoreEntry>();

  return {
    get(id: string): Conversation | undefined {
      const entry = store.get(id);
      if (!entry) return undefined;

      const now = Date.now();
      if (now - entry.lastAccessed > ttlMs) {
        store.delete(id);
        return undefined;
      }

      // Re-insert to maintain access-order for LRU eviction
      entry.lastAccessed = now;
      store.delete(id);
      store.set(id, entry);
      return entry.conversation;
    },

    set(id: string, conversation: Conversation): void {
      // Delete first so re-insertion moves to end of Map order
      store.delete(id);

      if (store.size >= maxSize) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) {
          store.delete(oldest);
        }
      }

      store.set(id, {
        conversation,
        lastAccessed: Date.now(),
      });
    },

    delete(id: string): void {
      store.delete(id);
    },
  };
}
