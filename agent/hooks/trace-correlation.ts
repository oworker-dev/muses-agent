import { SpanKind, trace } from "@opentelemetry/api";
import { defineHook } from "eve/hooks";

import {
  agentCorrelationAttributes,
  upstreamTraceContext,
} from "../lib/observability.ts";

const tracer = trace.getTracer("open-agent");

export default defineHook({
  events: {
    "turn.started"(_event, ctx) {
      const upstream = upstreamTraceContext(ctx.session);
      const span = tracer.startSpan("open_agent.turn.accepted", {
        attributes: {
          ...agentCorrelationAttributes(ctx.session),
          "open_agent.async_boundary": "workflow_queue",
          "open_agent.turn_id": ctx.session.turn.id,
          "open_agent.turn_sequence": ctx.session.turn.sequence,
        },
        kind: SpanKind.CONSUMER,
        ...(upstream
          ? {
              links: [{
                attributes: { "open_agent.link.kind": "host_request" },
                context: upstream,
              }],
            }
          : {}),
      });
      span.end();
    },
  },
});
