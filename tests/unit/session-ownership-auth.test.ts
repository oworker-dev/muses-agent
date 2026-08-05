import assert from "node:assert/strict";
import test from "node:test";

import type { AuthFn } from "eve/channels/auth";

import {
  publicationOwnerFromAuth,
  withSessionOwnership,
} from "../../agent/lib/session-ownership-auth.ts";
import type {
  AgentSessionOwner,
  AgentSessionOwnershipResult,
  AgentSessionOwnershipStore,
} from "../../server/data/session-ownership-store.ts";

const owner: AgentSessionOwner = {
  principalId: "issuer:user-1",
  principalType: "user",
  tenantId: "tenant-1",
};

const authenticate: AuthFn<Request> = async () => ({
  attributes: { tenantId: owner.tenantId },
  authenticator: "host-jwt",
  principalId: owner.principalId,
  principalType: owner.principalType,
});

test("allows a tenant principal to create a new session before ownership exists", async () => {
  const store = fakeStore("missing");
  const auth = withSessionOwnership(authenticate, store);
  const result = await auth(new Request("https://agent.test/eve/v1/session", { method: "POST" }));
  assert.equal(result?.principalId, owner.principalId);
  assert.equal(store.verifications.length, 0);
});

test("allows the exact tenant and principal to access an owned session", async () => {
  const store = fakeStore("owned");
  const auth = withSessionOwnership(authenticate, store);
  const result = await auth(new Request("https://agent.test/eve/v1/session/session-1/stream"));
  assert.equal(result?.principalId, owner.principalId);
  assert.deepEqual(store.verifications, [{ owner, sessionId: "session-1" }]);
});

test("rejects cross-tenant or cross-principal session access", async () => {
  const store = fakeStore("forbidden");
  const auth = withSessionOwnership(authenticate, store);
  await assert.rejects(
    async () => await auth(new Request("https://agent.test/eve/v1/session/session-1/cancel")),
    (error: unknown) =>
      error instanceof Error &&
      "response" in error &&
      (error.response as Response).status === 403,
  );
});

test("does not treat Eve's reset route as a session id", async () => {
  const store = fakeStore("missing");
  const auth = withSessionOwnership(authenticate, store);
  const result = await auth(new Request("https://agent.test/eve/v1/session/reset", { method: "POST" }));
  assert.equal(result?.principalId, owner.principalId);
  assert.equal(store.verifications.length, 0);
});

test("fails closed when a session owner cannot be resolved after the claim window", async () => {
  const store = fakeStore("missing");
  const auth = withSessionOwnership(authenticate, store);
  await assert.rejects(
    async () => await auth(new Request("https://agent.test/eve/v1/session/unknown")),
    (error: unknown) =>
      error instanceof Error &&
      "response" in error &&
      (error.response as Response).status === 403,
  );
});

test("allows a synthetic publication owner only for local development", () => {
  const localAuth = {
    attributes: {},
    authenticator: "local-dev",
    principalId: "local-dev",
    principalType: "local-dev",
  } as const;
  assert.deepEqual(publicationOwnerFromAuth(localAuth, { NODE_ENV: "development" }), {
    principalId: "local-dev",
    principalType: "local-dev",
    tenantId: "local-dev",
  });
  assert.throws(
    () => publicationOwnerFromAuth(localAuth, { NODE_ENV: "production" }),
    /tenant-scoped/,
  );
});

function fakeStore(result: AgentSessionOwnershipResult): AgentSessionOwnershipStore & {
  readonly verifications: Array<{ readonly owner: AgentSessionOwner; readonly sessionId: string }>;
} {
  const verifications: Array<{ readonly owner: AgentSessionOwner; readonly sessionId: string }> = [];
  return {
    async claim() {},
    async verify() {
      return result;
    },
    async waitForOwnership(sessionId, currentOwner) {
      verifications.push({ owner: currentOwner, sessionId });
      return result;
    },
    verifications,
  };
}
