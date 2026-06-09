/**
 * Server bridge for the event-bus example.
 *
 * Stats is a normal hsxComponent that increments a counter on each request.
 * The page wires it with `trigger="filter-changed from:body"` so the SAME
 * client-emitted CustomEvent that filters rows in the browser ALSO drives a
 * real HTMX request - proving HTMX hears the bus with no new bridge code.
 *
 * It declares `consumes` to advertise (via the `.events` descriptor) that it
 * reacts to the filter-changed event. That metadata wires nothing on its own.
 */
import { hsxComponent } from "@srdjan/hsx";
import { events } from "./events.ts";

let pings = 0;

export const Stats = hsxComponent("/stats", {
  methods: ["GET"],
  consumes: [events.filterChanged],
  handler: () => {
    pings++;
    return { pings };
  },
  render: ({ pings }: { pings: number }) => `Server pings: ${pings}`,
});
