import { createHmac, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const baseUrl = (
  process.env.AGENT_LOAD_BASE_URL?.trim() || "http://127.0.0.1:3100"
).replace(/\/$/, "");
const concurrency = boundedInteger("AGENT_LOAD_CONCURRENCY", 8, 1, 50);
const completionBudgetMs = boundedInteger(
  "AGENT_LOAD_P95_COMPLETION_MS",
  20_000,
  100,
  300_000,
);
const deadlineMs = boundedInteger(
  "AGENT_LOAD_DEADLINE_MS",
  60_000,
  1_000,
  600_000,
);
const batchId = `load-${Date.now()}-${randomUUID()}`;
const accessToken = signToken({
  actorType: "service",
  sub: `load-runner-${randomUUID()}`,
  tenantId: `load-tenant-${randomUUID()}`,
});
const providerDebugUrl = process.env.AGENT_LOAD_PROVIDER_DEBUG_URL?.trim();
const providerBefore = providerDebugUrl
  ? await providerRequestCount(providerDebugUrl)
  : undefined;

const cases = Array.from({ length: concurrency }, (_, index) => {
  const expected = `LOAD_READY_${batchId}_${index}`;
  return {
    expected,
    request: {
      idempotencyKey: `${batchId}:${index}`,
      message: `Do not use tools. Reply exactly: ${expected}`,
      metadata: { loadBatch: batchId, loadIndex: index },
      policy: {
        limits: {
          maxDurationMs: deadlineMs,
          maxInputTokens: 100_000,
          maxModelCalls: 2,
          maxOutputTokens: 1_000,
          maxToolCalls: 2,
          maxTurns: 1,
        },
      },
      profile: { profileId: "general-purpose", version: "0.1.0" },
    },
  };
});

const started = await Promise.all(
  cases.map(async (loadCase) => {
    const startedAt = performance.now();
    const payload = await api("POST", "/api/agent/runs", loadCase.request, 202);
    assert(payload.disposition === "started", "A load run was not newly started.");
    assert(typeof payload.run?.runId === "string", "A load run did not return a runId.");
    return {
      ...loadCase,
      admissionMs: performance.now() - startedAt,
      runId: payload.run.runId,
      startedAt,
    };
  }),
);

assert(
  new Set(started.map((entry) => entry.runId)).size === concurrency,
  "Concurrent submissions reused an AgentRun id.",
);

const completed = await Promise.all(
  started.map(async (entry) => {
    const run = await poll(entry.runId, entry.startedAt + deadlineMs);
    const completionMs = performance.now() - entry.startedAt;
    assert(run.status === "completed", `AgentRun ${entry.runId} ended as ${run.status}.`);
    assert(
      run.result?.kind === "text" && run.result.value === entry.expected,
      `AgentRun ${entry.runId} received another run's result.`,
    );
    assert(run.usage?.steps > 0, `AgentRun ${entry.runId} did not project step usage.`);
    assert(run.usage?.inputTokens > 0, `AgentRun ${entry.runId} did not project input usage.`);
    assert(run.usage?.outputTokens > 0, `AgentRun ${entry.runId} did not project output usage.`);

    const eventPage = await api(
      "GET",
      `/api/agent/runs/${encodeURIComponent(entry.runId)}/events?after=0`,
      undefined,
      200,
    );
    assert(Array.isArray(eventPage.events), `AgentRun ${entry.runId} returned invalid events.`);
    assert(eventPage.events.length > 0, `AgentRun ${entry.runId} returned no events.`);
    assert(
      eventPage.nextCursor === eventPage.events.length,
      `AgentRun ${entry.runId} returned an invalid event cursor.`,
    );
    eventPage.events.forEach((event, index) => {
      assert(event.runId === entry.runId, `AgentRun ${entry.runId} received a foreign event.`);
      assert(event.sequence === index + 1, `AgentRun ${entry.runId} has a broken event sequence.`);
    });
    const exhausted = await api(
      "GET",
      `/api/agent/runs/${encodeURIComponent(entry.runId)}/events?after=${eventPage.nextCursor}`,
      undefined,
      200,
    );
    assert(exhausted.events.length === 0, `AgentRun ${entry.runId} replayed exhausted events.`);
    return { ...entry, completionMs, eventCount: eventPage.nextCursor };
  }),
);

const replayed = await Promise.all(
  completed.map(async (entry) => {
    const payload = await api("POST", "/api/agent/runs", entry.request, 200);
    assert(payload.disposition === "replayed", `AgentRun ${entry.runId} was not replayed.`);
    assert(payload.run?.runId === entry.runId, `AgentRun ${entry.runId} replay changed identity.`);
    return payload.run.runId;
  }),
);
assert(new Set(replayed).size === concurrency, "Idempotent replay collapsed distinct load runs.");

if (providerDebugUrl && providerBefore !== undefined) {
  const providerAfter = await providerRequestCount(providerDebugUrl);
  assert(
    providerAfter - providerBefore === concurrency,
    `Expected ${concurrency} Provider requests, received ${providerAfter - providerBefore}.`,
  );
}

const admission = distribution(completed.map((entry) => entry.admissionMs));
const completion = distribution(completed.map((entry) => entry.completionMs));
const withinCompletionBudget = completion.p95Ms <= completionBudgetMs;

console.log(
  JSON.stringify({
    admission,
    batchId,
    completion,
    completionBudgetMs,
    concurrency,
    eventCount: completed.reduce((total, entry) => total + entry.eventCount, 0),
    idempotencyReplays: replayed.length,
    ok: withinCompletionBudget,
    providerRequests: providerDebugUrl ? concurrency : undefined,
  }),
);

assert(
  withinCompletionBudget,
  `AgentRun p95 completion ${completion.p95Ms}ms exceeded ${completionBudgetMs}ms.`,
);

async function poll(runId, deadline) {
  while (performance.now() < deadline) {
    const payload = await api(
      "GET",
      `/api/agent/runs/${encodeURIComponent(runId)}`,
      undefined,
      200,
    );
    if (["completed", "failed", "cancelled", "submission-ambiguous"].includes(payload.run.status)) {
      return payload.run;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`AgentRun ${runId} did not settle within ${deadlineMs}ms.`);
}

async function api(method, path, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(Math.min(deadlineMs, 120_000)),
  });
  const payload = await response.json().catch(() => undefined);
  if (response.status !== expectedStatus) {
    throw new Error(
      `${method} ${path} returned ${response.status}, expected ${expectedStatus}: ${
        payload?.error || payload?.message || "unknown error"
      }`,
    );
  }
  return payload;
}

async function providerRequestCount(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`Provider debug endpoint returned ${response.status}.`);
  const payload = await response.json();
  assert(Number.isSafeInteger(payload.requestCount), "Provider debug requestCount is invalid.");
  return payload.requestCount;
}

function signToken(claims) {
  const secret = required("AGENT_HOST_JWT_SECRET");
  const issuer = required("AGENT_HOST_JWT_ISSUER");
  const audience = required("AGENT_HOST_JWT_AUDIENCE");
  const now = Math.floor(Date.now() / 1_000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    ...claims,
    aud: audience,
    exp: now + Math.max(300, Math.ceil(deadlineMs / 1_000) + 60),
    iat: now,
    iss: issuer,
    jti: randomUUID(),
  });
  const input = `${header}.${payload}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}

function distribution(values) {
  const sorted = values.map((value) => Math.round(value)).sort((left, right) => left - right);
  return {
    maxMs: sorted.at(-1),
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
  };
}

function percentile(sorted, percentileValue) {
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
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
