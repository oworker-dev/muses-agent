import assert from "node:assert/strict";
import test from "node:test";

import { parseAgentRunPolicy } from "../../agent/lib/run-policy.ts";
import { resolveAgentRunPolicy } from "../../lib/agent-extension-catalog.ts";
import { parseStartAgentRun } from "../../server/agent-runs/input.ts";

const profile = { profileId: "general-purpose", version: "0.1.0" } as const;
const softwareTask = { id: "software-task", version: "1.0.0" } as const;

test("records a profile's exact default extension grant", () => {
  assert.deepEqual(resolveAgentRunPolicy(profile, {}), {
    mcpConnections: [],
    skills: [softwareTask],
  });
});

test("a run can narrow but cannot expand its profile extension grant", () => {
  assert.deepEqual(resolveAgentRunPolicy(profile, { skills: [] }), {
    mcpConnections: [],
    skills: [],
  });
  assert.throws(
    () => resolveAgentRunPolicy(profile, { skills: [{ id: "unknown", version: "1.0.0" }] }),
    /not allowed/,
  );
  assert.throws(
    () => resolveAgentRunPolicy(profile, { mcpConnections: [{ id: "github", version: "1.0.0" }] }),
    /not allowed/,
  );
});

test("revocation fails closed before a durable session starts", () => {
  assert.throws(
    () => resolveAgentRunPolicy(profile, {}, new Set(["software-task@1.0.0"])),
    /revoked/,
  );
});

test("extension references are pinned, strict, deduplicated, and sorted", () => {
  assert.deepEqual(
    parseAgentRunPolicy({ skills: [softwareTask, softwareTask] }),
    { skills: [softwareTask] },
  );
  assert.throws(
    () => parseAgentRunPolicy({ skills: [{ id: "software-task", version: "latest" }] }),
    /invalid extension ref/,
  );
  assert.throws(
    () => parseAgentRunPolicy({ skills: [{ id: "software-task", version: "1.0.0", token: "secret" }] }),
    /unknown field/,
  );
});

test("the public AgentRun boundary persists the resolved grant", () => {
  const parsed = parseStartAgentRun({
    idempotencyKey: "extension-policy-test",
    message: "Inspect the workspace.",
    profile,
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.value.policy, {
      mcpConnections: [],
      skills: [softwareTask],
    });
  }
});
