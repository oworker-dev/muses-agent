import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAgentRuntimeHost,
  resetEveAgentRun,
} from "../../server/agent-runs/eve-adapter.ts";

test("keeps an Eve runtime origin for the client route prefix", () => {
  assert.equal(
    normalizeAgentRuntimeHost("https://agent.example"),
    "https://agent.example/",
  );
});

test("repairs an Agent runtime URL that includes Eve's own route prefix", () => {
  assert.equal(
    normalizeAgentRuntimeHost("https://agent.example/internal/eve/v1/"),
    "https://agent.example/internal",
  );
});

test("rejects a non-HTTP Agent runtime URL", () => {
  assert.throws(
    () => normalizeAgentRuntimeHost("file:///tmp/eve"),
    /absolute HTTP\(S\) URL/,
  );
});

test("passes the continuation token when resetting an Eve session", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRuntimeUrl = process.env.AGENT_RUNTIME_URL;
  let body: unknown;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalRuntimeUrl === undefined) delete process.env.AGENT_RUNTIME_URL;
    else process.env.AGENT_RUNTIME_URL = originalRuntimeUrl;
  });
  process.env.AGENT_RUNTIME_URL = "https://agent.example";
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/eve\/v1\/session\/reset$/);
    assert.equal(init?.method, "POST");
    body = JSON.parse(String(init?.body));
    return Response.json({
      ok: true,
      previousSessionId: "session-1",
      status: "reset",
    });
  };

  const status = await resetEveAgentRun(
    "run-1",
    "correlation-1",
    "session-1",
    "continue-1",
    "token",
  );
  assert.equal(status, "reset");
  assert.deepEqual(body, { continuationToken: "continue-1" });
});

test("reports reset unavailable for a legacy run without a continuation token", async () => {
  assert.equal(
    await resetEveAgentRun("run-1", "correlation-1", "session-1", undefined, "token"),
    "unavailable",
  );
});
