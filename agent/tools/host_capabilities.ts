import { defineDynamic, defineTool } from "eve/tools";

import {
  isHostCapabilityConfigured,
  listHostCapabilities,
} from "../lib/host-capabilities";

const tool = defineTool({
  description:
    "List the authenticated host capabilities available in this Agent session. Use this before invoking a host-owned canvas, workflow, asset, or media capability.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute(_input, ctx) {
    return {
      capabilities: await listHostCapabilities(ctx),
    };
  },
});

export default defineDynamic({
  events: {
    "session.started": () => (isHostCapabilityConfigured() ? tool : null),
  },
});
