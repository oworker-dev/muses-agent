import { defineDynamic, defineTool } from "eve/tools";

import {
  listHostCapabilities,
  shouldExposeHostCapabilities,
} from "../lib/host-capabilities";

const tool = defineTool({
  description:
    "List the capabilities explicitly exposed by the authenticated host for this Agent session. Discover the active contract before invoking a host capability.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute(_input, ctx) {
    return {
      capabilities: await listHostCapabilities(ctx),
    };
  },
});

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => (shouldExposeHostCapabilities(ctx) ? tool : null),
  },
});
