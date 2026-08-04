import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";

import { closeAgentDatabasePools } from "../server/data/agent-database.ts";
import { createPostgresAgentExtensionStore } from "../server/data/agent-extension-store.ts";
import {
  enableAgentExtension,
  listAgentExtensions,
  revokeAgentExtension,
} from "../server/http/agent-extension-routes.ts";

const connectionString = required("AGENT_DATABASE_URL");
const schema = required("AGENT_DATABASE_SCHEMA");
const config = { connectionString, maxPoolSize: 2, schema };
const tenantId = `tenant-extension-verification-${randomUUID()}`;
const otherTenantId = `tenant-extension-verification-${randomUUID()}`;
const actorId = "extension-verification-admin";
const policy = { skills: [{ id: "software-task", version: "1.0.0" }] };
const store = createPostgresAgentExtensionStore(config);
const params = { extensionId: "software-task", version: "1.0.0" };
process.env.AGENT_HOST_JWT_SECRET = hostJwtSecret();
process.env.AGENT_HOST_JWT_ISSUER = "https://open-agent.extension-verification";
process.env.AGENT_HOST_JWT_AUDIENCE = "open-agent-extension-verification";

const unauthorized = await listAgentExtensions(
  new Request("https://agent.test/api/agent/extensions"),
  { store },
);
assert(unauthorized.status === 401, "The extension route did not reject a missing Host JWT.");

const forbidden = await listAgentExtensions(hostRequest("GET", tenantId, "agent.runs.write"), { store });
assert(forbidden.status === 403, "The extension route did not enforce agent.extensions.manage.");

const initialResponse = await listAgentExtensions(hostRequest("GET", tenantId), { store });
assert(initialResponse.status === 200, "The extension catalog HTTP request failed.");
const initialPayload = await initialResponse.json();
const initial = initialPayload.extensions;
assert(initial.length === 1, "The deployment catalog did not expose the published Skill.");
assert(initial[0].effectiveStatus === "enabled", "The published Skill default was not enabled.");
assert(initial[0].explicitlyConfigured === false, "The default must not fabricate a tenant installation.");
await store.assertPolicyAllowed(tenantId, policy);

const revokeResponse = await revokeAgentExtension(hostRequest("DELETE", tenantId), params, { store });
assert(revokeResponse.status === 200, "The extension revoke HTTP request failed.");
const revoked = (await revokeResponse.json()).extension;
assert(revoked.effectiveStatus === "revoked", "The Skill was not revoked.");
await assertRejects(
  () => store.assertPolicyAllowed(tenantId, policy),
  "extension_revoked",
);

const isolatedResponse = await listAgentExtensions(hostRequest("GET", otherTenantId), { store });
assert(isolatedResponse.status === 200, "The isolated tenant catalog HTTP request failed.");
const isolated = (await isolatedResponse.json()).extensions;
assert(isolated[0].effectiveStatus === "enabled", "One tenant's revoke leaked into another tenant.");

const enableResponse = await enableAgentExtension(hostRequest("PUT", tenantId, undefined, {}), params, { store });
assert(enableResponse.status === 200, "The extension enable HTTP request failed.");
const enableText = await enableResponse.text();
assert(!/credentialRef|credential_ref|vault:\/\//u.test(enableText), "HTTP output leaked credential references.");
const enabled = JSON.parse(enableText).extension;
assert(enabled.effectiveStatus === "enabled", "The Skill was not re-enabled.");
await store.assertPolicyAllowed(tenantId, policy);

const client = new pg.Client({ connectionString, application_name: "open-agent-extension-verify" });
await client.connect();
try {
  const audit = await client.query(
    `select action, before_state, after_state
       from "${schema}"."agent_extension_audit_events"
      where tenant_id = $1
      order by created_at asc`,
    [tenantId],
  );
  assert(audit.rows.length === 2, "Expected revoke and enable audit events.");
  assert(audit.rows[0].action === "revoked", "The first audit event must be revoke.");
  assert(audit.rows[1].action === "enabled", "The second audit event must be enable.");
  const serialized = JSON.stringify(audit.rows);
  assert(!/credentialRef|credential_ref|vault:\/\//u.test(serialized), "Audit output leaked credential references.");
} finally {
  await client.end();
  await closeAgentDatabasePools();
}

console.log(JSON.stringify({
  auditEvents: 2,
  catalogEntries: initial.length,
  defaultStatus: initial[0].effectiveStatus,
  httpAuthorization: [401, 403, 200],
  ok: true,
  tenantIsolation: true,
  transitions: ["revoked", "enabled"],
}));

function hostRequest(method, requestTenantId, scope = "agent.extensions.manage", body) {
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  const token = signJwt({
    actorType: "user",
    aud: "open-agent-extension-verification",
    exp: Math.floor(Date.now() / 1000) + 300,
    iss: "https://open-agent.extension-verification",
    scope,
    sub: actorId,
    tenantId: requestTenantId,
  });
  return new Request("https://agent.test/api/agent/extensions", {
    body: serialized,
    headers: {
      authorization: `Bearer ${token}`,
      ...(serialized === undefined ? {} : { "content-type": "application/json" }),
    },
    method,
  });
}

function signJwt(payload) {
  const encodedHeader = encodePart({ alg: "HS256", typ: "JWT" });
  const encodedPayload = encodePart(payload);
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", hostJwtSecret()).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function encodePart(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function hostJwtSecret() {
  return "01234567890123456789012345678901";
}

async function assertRejects(operation, code) {
  try {
    await operation();
  } catch (error) {
    assert(error?.code === code, `Expected ${code}, received ${error?.code || error}.`);
    return;
  }
  throw new Error(`Expected ${code}, but the operation succeeded.`);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
