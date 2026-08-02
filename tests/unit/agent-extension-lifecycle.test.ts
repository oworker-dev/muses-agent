import assert from "node:assert/strict";
import test from "node:test";

import {
  AgentExtensionAccessError,
  assertAgentRunExtensionsEnabled,
  assertCredentialReference,
} from "../../lib/agent-extension-lifecycle.ts";

const softwareTask = { id: "software-task", version: "1.0.0" } as const;

test("uses the deployment manifest default until a tenant explicitly revokes a Skill", () => {
  assert.doesNotThrow(() => assertAgentRunExtensionsEnabled({ skills: [softwareTask] }, []));
  assert.throws(
    () => assertAgentRunExtensionsEnabled(
      { skills: [softwareTask] },
      [{ ...softwareTask, credentialConfigured: false, kind: "skill", status: "revoked" }],
    ),
    (error) => error instanceof AgentExtensionAccessError && error.code === "extension_revoked",
  );
});

test("fails closed for extension refs absent from the deployment catalog", () => {
  assert.throws(
    () => assertAgentRunExtensionsEnabled(
      { mcpConnections: [{ id: "unpublished-mcp", version: "1.0.0" }] },
      [],
    ),
    (error) => error instanceof AgentExtensionAccessError && error.code === "extension_not_enabled",
  );
});

test("accepts opaque credential references and rejects secret-shaped values", () => {
  assert.doesNotThrow(() => assertCredentialReference("vault://tenant/connections/github"));
  assert.doesNotThrow(() => assertCredentialReference("vercel-connect://mcp.linear.app/linear"));
  assert.throws(() => assertCredentialReference("sk-live-secret"), /never a credential value/);
  assert.throws(() => assertCredentialReference("https://example.com/token"), /never a credential value/);
});
