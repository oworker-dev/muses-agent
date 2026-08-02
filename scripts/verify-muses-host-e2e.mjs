import { createHmac, randomUUID } from "node:crypto";

const serviceUrl = required("MUSES_AGENT_SERVICE_URL").replace(/\/$/, "");
const userId = required("MUSES_E2E_USER_ID");
const workspaceId = required("MUSES_E2E_WORKSPACE_ID");
const deploymentId = required("MUSES_E2E_DEPLOYMENT_ID");
const token = createToken({ userId, workspaceId, actorType: "service" });
const idempotencyKey = `muses-host-e2e:${Date.now()}:${randomUUID()}`;
const request = {
  idempotencyKey,
  message: `MUSES_HOST_E2E: inspect the canvas, invoke Workflow deployment ${deploymentId}, wait for completion, place the verified run on the canvas, inspect the canvas again, and report the result.`,
  profile: { profileId: "muses-platform", version: "0.1.0" },
  policy: {
    hostCapabilities: [
      "canvas.inspect",
      "canvas.item.put",
      "workflow.invoke",
      "workflow.run.inspect",
      "workflow.run.wait",
    ],
    limits: {
      maxTurns: 1,
      maxModelCalls: 16,
      maxToolCalls: 16,
      maxInputTokens: 200_000,
      maxOutputTokens: 20_000,
      maxDurationMs: 120_000,
    },
  },
  metadata: { verification: "muses-host-workflow-canvas-e2e" },
};

const started = await api("POST", "/api/agent/runs", request, 202);
const replay = await api("POST", "/api/agent/runs", request, 200);
assert(replay.disposition === "replayed", "AgentRun idempotency replay was not reported.");
assert(replay.run.runId === started.run.runId, "AgentRun replay returned another run.");

const run = await poll(started.run.runId);
assert(run.status === "completed", `AgentRun ended as ${run.status}: ${run.failure?.message || "unknown failure"}`);
assert(run.result?.kind === "text" && run.result.value.includes("MUSES_HOST_E2E_COMPLETED"), "Agent did not report the completed Host workflow.");
assert(run.usage.inputTokens > 0 && run.usage.outputTokens > 0 && run.usage.steps > 0, "Agent usage was not projected.");

const eventPayload = await api("GET", `/api/agent/runs/${encodeURIComponent(run.runId)}/events?after=0`, undefined, 200);
const serialized = JSON.stringify(eventPayload.events);
for (const capability of ["canvas.inspect", "workflow.invoke", "workflow.run.wait", "canvas.item.put"]) {
  assert(serialized.includes(capability), `Agent event stream is missing ${capability}.`);
}
assert(serialized.includes("completed"), "Agent never observed a completed Workflow run.");
assert(eventPayload.events.some((event) => event.type === "tool.completed"), "Host tool completion was not projected.");
const hostResults = eventPayload.events
  .filter((event) => event.type === "tool.completed" && event.data?.status === "completed")
  .map((event) => event.data?.result?.output)
  .filter((output) => output?.capability);
const workflowInspection = hostResults.find(
  (output) =>
    output.capability === "workflow.run.wait" &&
    output.output?.status === "completed",
);
assert(workflowInspection, "Platform Agent did not observe a completed Workflow run.");
assert(
  workflowInspection.output.completedNodeIds?.includes("agent-run-1"),
  "The Workflow Agent node did not complete.",
);
assert(
  workflowInspection.output.outputs?.result?.value === "BRIDGE_READY",
  "The Workflow Agent node result was not projected.",
);
const workflowRunId = workflowInspection.output.runId;
const canvasPut = hostResults.find(
  (output) =>
    output.capability === "canvas.item.put" &&
    output.output?.item?.refId === workflowRunId,
);
assert(canvasPut, "The completed Workflow run was not placed on the canvas.");
const finalCanvas = hostResults
  .filter((output) => output.capability === "canvas.inspect")
  .at(-1);
assert(
  finalCanvas?.output?.canvas?.items?.some(
    (item) => item.kind === "workflow" && item.refId === workflowRunId,
  ),
  "The final canvas inspection did not contain the Workflow run.",
);

console.log(JSON.stringify({
  ok: true,
  agentRunId: run.runId,
  eventCount: run.eventCount,
  idempotency: replay.disposition,
  result: run.result.value,
  usage: run.usage,
}));

async function poll(runId) {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const payload = await api("GET", `/api/agent/runs/${encodeURIComponent(runId)}`, undefined, 200);
    if (["completed", "failed", "cancelled"].includes(payload.run.status)) return payload.run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("AgentRun did not settle within 150 seconds.");
}

async function api(method, path, body, expectedStatus) {
  const response = await fetch(`${serviceUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => undefined);
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${path} returned ${response.status}: ${payload?.message || "unknown error"}`);
  }
  return payload;
}

function createToken(actor) {
  const secret = required("MUSES_AGENT_HOST_JWT_SECRET");
  const issuer = required("MUSES_AGENT_HOST_JWT_ISSUER");
  const audience = required("MUSES_AGENT_HOST_JWT_AUDIENCE");
  const now = Math.floor(Date.now() / 1_000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    actorType: actor.actorType,
    aud: audience,
    exp: now + 300,
    iat: now,
    iss: issuer,
    jti: randomUUID(),
    sub: actor.userId,
    tenantId: actor.workspaceId,
  });
  const input = `${header}.${payload}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
