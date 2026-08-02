import { registerOTel } from "@vercel/otel";
import { defineInstrumentation } from "eve/instrumentation";
import { agentCorrelationAttributes } from "./lib/observability.ts";

/**
 * Keep provider payloads out of the default trace export. Correlation fields
 * are enough to join AgentRun, Workflow and Host records without duplicating
 * prompts or model output in a third-party telemetry backend.
 */
export default defineInstrumentation({
  functionId: "muses-agent",
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
        "muses.agent.session_id": session.id,
        "muses.agent.turn_id": turn.id,
        "muses.agent.turn_sequence": turn.sequence,
        "muses.agent.step_index": step.index,
        "muses.agent.channel": channel.kind,
      },
    }),
  },
});
