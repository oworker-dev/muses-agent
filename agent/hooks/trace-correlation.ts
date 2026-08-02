import { SpanKind, trace } from "@opentelemetry/api";
import { defineHook } from "eve/hooks";

import {
  agentCorrelationAttributes,
  upstreamTraceContext,
} from "../lib/observability.ts";

const tracer = trace.getTracer("muses-agent");

export default defineHook({
  events: {
    "turn.started"(_event, ctx) {
      const upstream = upstreamTraceContext(ctx.session);
      const span = tracer.startSpan("muses.agent.turn.accepted", {
        attributes: {
          ...agentCorrelationAttributes(ctx.session),
          "muses.agent.async_boundary": "workflow_queue",
          "muses.agent.turn_id": ctx.session.turn.id,
          "muses.agent.turn_sequence": ctx.session.turn.sequence,
        },
        kind: SpanKind.CONSUMER,
        ...(upstream
          ? {
              links: [{
                attributes: { "muses.agent.link.kind": "host_request" },
                context: upstream,
              }],
            }
          : {}),
      });
      span.end();
    },
  },
});
