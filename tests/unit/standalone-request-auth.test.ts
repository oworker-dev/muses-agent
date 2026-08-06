import assert from "node:assert/strict";
import test from "node:test";

import {
  authenticateStandaloneRequest,
  resolveStandaloneRequestIdentity,
} from "../../server/http/standalone-request-auth.ts";
import { standaloneCookieAuth } from "../../agent/lib/standalone-auth.ts";

test("issues an opaque standalone identity cookie and reuses it", () => {
  const created = authenticateStandaloneRequest(new Request("http://agent.example.test/"));
  assert.match(created.identity.principalId, /^anonymous:[A-Za-z0-9_-]{43}$/);
  assert.equal(created.identity.tenantId, "open-agent-standalone");
  assert.match(created.setCookie ?? "", /^open_agent_anonymous=[A-Za-z0-9_-]{43};/);
  assert.match(created.setCookie ?? "", /HttpOnly/);
  assert.doesNotMatch(created.setCookie ?? "", /Secure/);

  const cookie = created.setCookie?.split(";", 1)[0];
  const restored = authenticateStandaloneRequest(new Request("http://agent.example.test/", {
    headers: { cookie: cookie ?? "" },
  }));
  assert.equal(restored.identity.principalId, created.identity.principalId);
  assert.equal(restored.setCookie, undefined);
});

test("marks the anonymous cookie secure behind an HTTPS proxy", () => {
  const authenticated = authenticateStandaloneRequest(new Request("http://agent.internal/", {
    headers: { "x-forwarded-proto": "https" },
  }));
  assert.match(authenticated.setCookie ?? "", /; Secure$/);
});

test("read-only identity resolution does not mint missing or malformed cookies", () => {
  assert.equal(
    resolveStandaloneRequestIdentity(new Request("https://agent.example.test/")),
    undefined,
  );
  assert.equal(
    resolveStandaloneRequestIdentity(new Request("https://agent.example.test/", {
      headers: { cookie: "open_agent_anonymous=not-a-valid-credential" },
    })),
    undefined,
  );
});

test("Eve standalone auth resolves the same principal as thread storage", async () => {
  const created = authenticateStandaloneRequest(new Request("https://agent.example.test/"));
  const cookie = created.setCookie?.split(";", 1)[0] ?? "";
  const request = new Request("https://agent.example.test/eve/v1/session", {
    headers: { cookie },
  });

  assert.deepEqual(resolveStandaloneRequestIdentity(request), created.identity);
  assert.deepEqual(await standaloneCookieAuth()(request), {
    attributes: { tenantId: created.identity.tenantId },
    authenticator: "standalone-cookie",
    principalId: created.identity.principalId,
    principalType: created.identity.principalType,
  });
});
