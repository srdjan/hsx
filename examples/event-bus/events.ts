/**
 * Typed client-bus event registry for the event-bus example.
 *
 * Each event() call brands a name with its detail payload type so emit/on
 * attributes and component emits/consumes are type-checked against one source.
 */
import { event } from "@srdjan/hsx";

export const events = {
  /** A filter pill was chosen. Drives client-side row filtering + the server bridge. */
  filterChanged: event<{ filter: "all" | "active" | "done" }>("filter-changed"),
  /** Show a transient toast message. */
  toast: event<{ message: string }>("toast"),
  /** Optimistically add a todo from the input's current value. */
  todoAdd: event<{ value: string }>("todo-add"),
};
