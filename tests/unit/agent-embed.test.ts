import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_EMBED_CONTRACT_VERSION,
  isAllowedAgentEmbedParentOrigin,
  parseAgentEmbedEvent,
  parseAgentEmbedHostMessage,
} from "../../contracts/agent-embed.ts";
import { DEFAULT_AGENT_RUNTIME_CONFIG } from "../../lib/agent-runtime-config.ts";

test("accepts a valid in-memory embed configuration", () => {
  const parsed = parseAgentEmbedHostMessage({
    type: "agent.embed.configure",
    contractVersion: AGENT_EMBED_CONTRACT_VERSION,
    requestId: "request-1",
    accessToken: "a-valid-short-lived-token",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    serviceUrl: "https://agent.example",
    storageKey: "tenant:project:threads",
    profile: { id: "general-purpose", version: "0.1.0" },
    runtimeConfig: DEFAULT_AGENT_RUNTIME_CONFIG,
    theme: "light",
  });
  assert.equal(parsed?.profile.id, "general-purpose");
});

test("rejects tokens in an invalid or unknown protocol message", () => {
  assert.equal(parseAgentEmbedHostMessage({
    type: "agent.embed.configure",
    contractVersion: "9.0.0",
    accessToken: "secret-token",
  }), undefined);
});

test("parses bounded host events and rejects non-JSON capability output", () => {
  assert.deepEqual(
    parseAgentEmbedEvent({
      type: "agent.embed.host-capability-completed",
      contractVersion: AGENT_EMBED_CONTRACT_VERSION,
      capability: "canvas.inspect",
      output: { ok: true },
    }),
    {
      type: "agent.embed.host-capability-completed",
      contractVersion: AGENT_EMBED_CONTRACT_VERSION,
      capability: "canvas.inspect",
      output: { ok: true },
    },
  );
  assert.equal(
    parseAgentEmbedEvent({
      type: "agent.embed.host-capability-completed",
      contractVersion: AGENT_EMBED_CONTRACT_VERSION,
      capability: "canvas.inspect",
      output: { invalid: undefined },
    }),
    undefined,
  );
});

test("derives only an exact allowlisted parent origin from referrer", () => {
  const allowed = ["https://muses.example"];
  assert.equal(
    isAllowedAgentEmbedParentOrigin("https://muses.example/studio", allowed),
    "https://muses.example",
  );
  assert.equal(
    isAllowedAgentEmbedParentOrigin("https://evil.example/studio", allowed),
    undefined,
  );
});
