import assert from "node:assert/strict";
import test from "node:test";

import { createPreviewToken } from "../../lib/preview-token.ts";
import {
  authenticatePreviewRequest,
  recoverOwnedPreviewRequest,
} from "../../server/http/preview-request-auth.ts";
import { authenticateStandaloneRequest } from "../../server/http/standalone-request-auth.ts";

const previewId = "prv_123e4567-e89b-12d3-a456-426614174000";
const secret = "preview-secret-that-is-longer-than-32-characters";
const now = new Date("2029-01-01T00:00:00.000Z");
const expiresAt = new Date("2029-01-01T01:00:00.000Z");
const token = createPreviewToken(previewId, expiresAt, secret);

test("entrypoint token establishes path-scoped preview resource access", () => {
  const request = new Request(
    `http://agent.test/api/previews/${previewId}/index.html?token=${encodeURIComponent(token)}`,
  );
  const access = authenticatePreviewRequest(request, previewId, now, secret);

  assert.deepEqual(access?.claims, { expiresAt: expiresAt.toISOString(), previewId });
  assert.match(access?.setCookie ?? "", /^open_agent_preview_access=/u);
  assert.match(access?.setCookie ?? "", new RegExp(`Path=/api/previews/${previewId}/`));
  assert.match(access?.setCookie ?? "", /Max-Age=3600/u);
  assert.match(access?.setCookie ?? "", /HttpOnly/u);
  assert.match(access?.setCookie ?? "", /SameSite=Lax/u);
  assert.doesNotMatch(access?.setCookie ?? "", /Secure/u);
});

test("relative preview assets authenticate with the entrypoint cookie", () => {
  const entrypoint = authenticatePreviewRequest(
    new Request(`https://agent.test/api/previews/${previewId}/index.html?token=${encodeURIComponent(token)}`),
    previewId,
    now,
    secret,
  );
  const cookie = entrypoint?.setCookie?.split(";", 1)[0] ?? "";
  const asset = authenticatePreviewRequest(
    new Request(`https://agent.test/api/previews/${previewId}/styles.css`, {
      headers: { cookie },
    }),
    previewId,
    now,
    secret,
  );

  assert.deepEqual(asset, {
    claims: { expiresAt: expiresAt.toISOString(), previewId },
  });
  assert.match(entrypoint?.setCookie ?? "", /; Secure$/u);
});

test("missing, malformed, expired, and cross-preview credentials are rejected", () => {
  const assetUrl = `https://agent.test/api/previews/${previewId}/styles.css`;
  assert.equal(authenticatePreviewRequest(new Request(assetUrl), previewId, now, secret), undefined);
  assert.equal(authenticatePreviewRequest(new Request(assetUrl, {
    headers: { cookie: "open_agent_preview_access=malformed" },
  }), previewId, now, secret), undefined);
  assert.equal(authenticatePreviewRequest(new Request(assetUrl, {
    headers: { cookie: `open_agent_preview_access=${encodeURIComponent(token)}` },
  }), "prv_123e4567-e89b-12d3-a456-426614174001", now, secret), undefined);
  assert.equal(authenticatePreviewRequest(new Request(assetUrl, {
    headers: { cookie: `open_agent_preview_access=${encodeURIComponent(token)}` },
  }), previewId, expiresAt, secret), undefined);
});

test("a standalone owner can recover an unexpired preview after key rotation", () => {
  const standalone = authenticateStandaloneRequest(new Request("https://agent.test/"));
  const cookie = standalone.setCookie?.split(";", 1)[0] ?? "";
  const preview = {
    createdAt: now.toISOString(),
    entrypoint: "index.html",
    expiresAt: expiresAt.toISOString(),
    fileCount: 3,
    previewId,
    principalId: standalone.identity.principalId,
    sessionId: "session-1",
    tenantId: standalone.identity.tenantId,
    totalBytes: 100,
  };
  const access = recoverOwnedPreviewRequest(
    new Request(`https://agent.test/api/previews/${previewId}/index.html?token=stale`, {
      headers: { cookie },
    }),
    preview,
    now,
    secret,
  );
  assert.deepEqual(access?.claims, { expiresAt: expiresAt.toISOString(), previewId });
  assert.match(access?.setCookie ?? "", /^open_agent_preview_access=/u);

  assert.equal(recoverOwnedPreviewRequest(
    new Request(`https://agent.test/api/previews/${previewId}/index.html`, {
      headers: { cookie },
    }),
    { ...preview, principalId: "anonymous:another-browser" },
    now,
    secret,
  ), undefined);
});
