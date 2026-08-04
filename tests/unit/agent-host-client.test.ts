import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentClientContractError,
  AgentClientHttpError,
  createAgentRunClient,
} from "@oworker/open-agent-client";

const run = {
  contractVersion: "0.1.0-draft",
  correlationId: "corr-1",
  createdAt: "2026-08-01T00:00:00.000Z",
  eventCount: 0,
  harness: { kind: "eve" },
  metadata: {},
  profile: { profileId: "general-purpose", version: "0.1.0" },
  revision: 1,
  runId: "arun_12345678901234567890123456789012",
  status: "running",
  updatedAt: "2026-08-01T00:00:00.000Z",
  usage: {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    steps: 0,
  },
} as const;

test("AgentRun client sends a Host JWT and preserves idempotency input", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = createAgentRunClient({
    baseUrl: "https://agent.example/",
    getAccessToken: () => "host-token",
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      return Response.json({ disposition: "started", run }, { status: 202 });
    },
  });

  const response = await client.start({
    idempotencyKey: "workflow-step-123",
    message: "Create a reusable outline.",
    profile: { profileId: "general-purpose", version: "0.1.0" },
  });

  assert.equal(response.run.runId, run.runId);
  assert.equal(requests[0]?.url, "https://agent.example/api/agent/runs");
  assert.equal(new Headers(requests[0]?.init?.headers).get("authorization"), "Bearer host-token");
  assert.match(String(requests[0]?.init?.body), /workflow-step-123/);
});

test("AgentRun client exposes structured service failures", async () => {
  const client = createAgentRunClient({
    baseUrl: "https://agent.example",
    getAccessToken: () => "host-token",
    fetch: async () => Response.json(
      { code: "agent_run_idempotency_conflict", message: "Conflict" },
      { status: 409 },
    ),
  });

  await assert.rejects(
    () => client.inspect(run.runId),
    (error: unknown) => error instanceof AgentClientHttpError
      && error.status === 409
      && error.message === "Conflict",
  );
});

test("AgentRun client rejects credential forwarding redirects by default", async () => {
  let redirect: RequestRedirect | undefined;
  const client = createAgentRunClient({
    baseUrl: "https://agent.example",
    getAccessToken: () => "host-token",
    fetch: async (_url, init) => {
      redirect = init?.redirect;
      return Response.json({ run });
    },
  });

  await client.inspect(run.runId);
  assert.equal(redirect, "error");
});

test("AgentRun client validates successful service responses", async () => {
  const client = createAgentRunClient({
    baseUrl: "https://agent.example",
    getAccessToken: () => "host-token",
    fetch: async () => Response.json({ run: { runId: "incomplete" } }),
  });

  await assert.rejects(
    () => client.inspect(run.runId),
    (error: unknown) => error instanceof AgentClientContractError,
  );
});

test("AgentRun client resolves rotating headers and rejects invalid cursors", async () => {
  let requestHeaders = new Headers();
  const client = createAgentRunClient({
    baseUrl: "https://agent.example",
    getAccessToken: () => "host-token",
    headers: async () => ({ "x-host-request": "request-1" }),
    fetch: async (_url, init) => {
      requestHeaders = new Headers(init?.headers);
      return Response.json({ events: [], nextCursor: 0, run });
    },
  });

  await client.events(run.runId);
  assert.equal(requestHeaders.get("x-host-request"), "request-1");
  await assert.rejects(() => client.events(run.runId, -1), RangeError);
});
