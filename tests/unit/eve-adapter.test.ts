import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAgentRuntimeHost,
  readEveAgentEvents,
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

test("reads a bounded no-store snapshot and closes at Eve's durable tail", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRuntimeUrl = process.env.AGENT_RUNTIME_URL;
  let cancelled = false;
  let requestCache: RequestCache | undefined;
  let requestUrl = "";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalRuntimeUrl === undefined) delete process.env.AGENT_RUNTIME_URL;
    else process.env.AGENT_RUNTIME_URL = originalRuntimeUrl;
  });
  process.env.AGENT_RUNTIME_URL = "https://agent.example";
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer token");
    assert.equal(headers.get("x-agent-correlation-id"), "correlation-1");
    assert.equal(headers.get("x-agent-run-id"), "run-1");
    requestCache = init?.cache;
    requestUrl = String(input);
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
        return new Promise(() => undefined);
      },
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          `${JSON.stringify({
            data: {},
            meta: { at: "2026-08-03T00:00:00.000Z", id: "evt_01KZ0000000000000000000000" },
            type: "session.started",
          })}\n`,
        ));
      },
    });
    return new Response(stream, {
      headers: { "x-eve-stream-tail-index": "0" },
    });
  };

  const events = await readEveAgentEvents(
    "run-1",
    "correlation-1",
    "session-1",
    "token",
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "session.started");
  assert.equal(requestCache, "no-store");
  assert.match(requestUrl, /includeTailIndex=1/);
  assert.doesNotMatch(requestUrl, /stream%3F/);
  assert.equal(cancelled, true);
});

test("rejects a bounded snapshot without a valid durable tail", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRuntimeUrl = process.env.AGENT_RUNTIME_URL;
  let cancelled = false;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalRuntimeUrl === undefined) delete process.env.AGENT_RUNTIME_URL;
    else process.env.AGENT_RUNTIME_URL = originalRuntimeUrl;
  });
  process.env.AGENT_RUNTIME_URL = "https://agent.example";
  globalThis.fetch = async () => new Response(new ReadableStream({
    cancel() {
      cancelled = true;
    },
  }));

  await assert.rejects(
    readEveAgentEvents("run-1", "correlation-1", "session-1", "token"),
    /valid bounded stream tail index/,
  );
  assert.equal(cancelled, true);
});

test("rejects a stream that closes before its declared durable tail", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRuntimeUrl = process.env.AGENT_RUNTIME_URL;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalRuntimeUrl === undefined) delete process.env.AGENT_RUNTIME_URL;
    else process.env.AGENT_RUNTIME_URL = originalRuntimeUrl;
  });
  process.env.AGENT_RUNTIME_URL = "https://agent.example";
  globalThis.fetch = async () => new Response(
    `${JSON.stringify({ data: {}, meta: { at: "2026-08-03T00:00:00.000Z" }, type: "session.started" })}\n`,
    { headers: { "x-eve-stream-tail-index": "1" } },
  );

  await assert.rejects(
    readEveAgentEvents("run-1", "correlation-1", "session-1", "token"),
    /ended before its declared durable tail/,
  );
});
