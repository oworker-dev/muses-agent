import assert from "node:assert/strict";
import test from "node:test";

import {
  agentCorrelationAttributes,
  parseRemoteTraceParent,
  upstreamTraceContext,
} from "../../agent/lib/observability.ts";

const TRACE_PARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

test("parses a sampled W3C trace parent as a remote span context", () => {
  assert.deepEqual(parseRemoteTraceParent(TRACE_PARENT), {
    isRemote: true,
    spanId: "00f067aa0ba902b7",
    traceFlags: 1,
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  });
});

test("rejects malformed and all-zero W3C trace parents", () => {
  assert.equal(parseRemoteTraceParent("invalid"), undefined);
  assert.equal(
    parseRemoteTraceParent("00-00000000000000000000000000000000-00f067aa0ba902b7-01"),
    undefined,
  );
  assert.equal(
    parseRemoteTraceParent("00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01"),
    undefined,
  );
});

test("projects AgentRun correlation fields without prompt or output content", () => {
  const session = {
    auth: {
      current: {
        attributes: {
          agentCorrelationId: "corr-123",
          agentProfileId: "general-purpose",
          agentProfileVersion: "0.1.0",
          agentRunId: "arun_12345678",
          agentUpstreamTraceParent: TRACE_PARENT,
          canvasId: "canvas-123",
          projectId: "project-123",
          tenantId: "tenant-123",
        },
      },
    },
    id: "session-123",
  } as const;

  assert.deepEqual(agentCorrelationAttributes(session), {
    "muses.agent.canvas_id": "canvas-123",
    "muses.agent.correlation_id": "corr-123",
    "muses.agent.profile_id": "general-purpose",
    "muses.agent.profile_version": "0.1.0",
    "muses.agent.project_id": "project-123",
    "muses.agent.run_id": "arun_12345678",
    "muses.agent.session_id": "session-123",
    "muses.agent.tenant_id": "tenant-123",
  });
  assert.equal(upstreamTraceContext(session)?.traceId, "4bf92f3577b34da6a3ce929d0e0e4736");
});
