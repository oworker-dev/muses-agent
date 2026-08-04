import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";

import {
  invokeHostCapability,
  shouldExposeHostCapabilities,
} from "../lib/host-capabilities";

const tool = defineTool({
  description:
    "Invoke one capability explicitly exposed by the authenticated host. The capability name and input must come from host_capabilities; never invent a host capability.",
  inputSchema: z.object({
    capability: z.string().trim().min(1).max(160),
    input: z.record(z.string(), z.unknown()).default({}),
  }),
  approval: ({ session }) =>
    session.auth.current?.attributes.actorType === "service"
      ? "not-applicable"
      : "user-approval",
  async execute(input, ctx) {
    return {
      capability: input.capability,
      output: await invokeHostCapability(ctx, {
        capability: input.capability,
        input: input.input as Record<string, never>,
        correlationId: ctx.callId,
      }, ctx.abortSignal),
    };
  },
});

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => (shouldExposeHostCapabilities(ctx) ? tool : null),
  },
});
