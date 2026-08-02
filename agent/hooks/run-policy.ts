import { defineHook } from "eve/hooks";

import {
  initializeRunPolicy,
  readAgentRunPolicy,
  recordRunPolicyBoundary,
  recordRunPolicyUsage,
} from "../lib/run-policy.ts";

export default defineHook({
  events: {
    "session.started"(_event, ctx) {
      initializeRunPolicy();
      readAgentRunPolicy(ctx);
    },
    "turn.started"(_event, ctx) {
      recordRunPolicyBoundary(readAgentRunPolicy(ctx), "turn");
    },
    "step.started"(_event, ctx) {
      recordRunPolicyBoundary(readAgentRunPolicy(ctx), "model");
    },
    "actions.requested"(event, ctx) {
      const actions = Array.isArray(event.data.actions) ? event.data.actions : [];
      recordRunPolicyBoundary(readAgentRunPolicy(ctx), "tool", actions.length);
    },
    "step.completed"(event, ctx) {
      const usage = toUsage(event.data.usage);
      recordRunPolicyUsage(readAgentRunPolicy(ctx), usage);
    },
  },
});

function toUsage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { inputTokens: 0, outputTokens: 0 };
  }
  const usage = value as Record<string, unknown>;
  return {
    inputTokens: nonNegative(usage.inputTokens),
    outputTokens: nonNegative(usage.outputTokens),
  };
}

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}
