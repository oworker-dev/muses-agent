import { registerOTel } from "@vercel/otel";
import { defineInstrumentation } from "eve/instrumentation";
import { agentCorrelationAttributes } from "./lib/observability.ts";

/**
 * Keep provider payloads out of the default trace export. Correlation fields
 * are enough to join AgentRun, Workflow and Host records without duplicating
 * prompts or model output in a third-party telemetry backend.
 */
export default defineInstrumentation({
  functionId: "open-agent",
  recordInputs: false,
  recordOutputs: false,
  setup: ({ agentName }) => registerOTel({
    serviceName: agentName,
    instrumentationConfig: {
      fetch: {
        propagateContextUrls: process.env.AGENT_HOST_TOOLS_URL
          ? [new URL(process.env.AGENT_HOST_TOOLS_URL).origin]
          : [],
      },
    },
  }),
  events: {
    "step.started": ({ session, turn, step, channel }) => ({
      runtimeContext: {
        ...agentCorrelationAttributes(session),
        "open_agent.session_id": session.id,
        "open_agent.turn_id": turn.id,
        "open_agent.turn_sequence": turn.sequence,
        "open_agent.step_index": step.index,
        "open_agent.channel": channel.kind,
      },
    }),
  },
});
