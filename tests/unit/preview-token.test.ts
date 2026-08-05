import assert from "node:assert/strict";
import test from "node:test";
import {
  createPreviewToken,
  createArtifactToken,
  readPreviewSigningSecret,
  readPreviewTtlSeconds,
  verifyPreviewToken,
  verifyArtifactToken,
} from "../../lib/preview-token.ts";

const previewId = "prv_123e4567-e89b-12d3-a456-426614174000";
const secret = "preview-secret-that-is-longer-than-32-characters";

test("preview tokens verify for the intended preview and expiry", () => {
  const expiresAt = new Date("2030-01-01T00:00:00.000Z");
  const token = createPreviewToken(previewId, expiresAt, secret);
  assert.deepEqual(verifyPreviewToken(token, previewId, new Date("2029-01-01T00:00:00.000Z"), secret), {
    expiresAt: expiresAt.toISOString(),
    previewId,
  });
  assert.equal(verifyPreviewToken(token, "prv_123e4567-e89b-12d3-a456-426614174001", new Date("2029-01-01T00:00:00.000Z"), secret), undefined);
  assert.equal(verifyPreviewToken(token, previewId, new Date("2030-01-01T00:00:00.001Z"), secret), undefined);
});

test("preview configuration validates secret and bounded lifetime", () => {
  assert.equal(readPreviewSigningSecret({ AGENT_PREVIEW_SIGNING_SECRET: secret }), secret);
  assert.equal(readPreviewTtlSeconds({}), 86_400);
  assert.equal(readPreviewTtlSeconds({ AGENT_PREVIEW_TTL_SECONDS: "3600" }), 3_600);
  assert.throws(() => readPreviewSigningSecret({ AGENT_PREVIEW_SIGNING_SECRET: "short" }), /at least 32/);
  assert.throws(() => readPreviewTtlSeconds({ AGENT_PREVIEW_TTL_SECONDS: "30" }), /from 60/);
});

test("artifact tokens are scoped independently from preview tokens", () => {
  const artifactId = "art_123e4567-e89b-12d3-a456-426614174000";
  const expiresAt = new Date("2030-01-01T00:00:00.000Z");
  const token = createArtifactToken(artifactId, expiresAt, secret);
  assert.deepEqual(
    verifyArtifactToken(token, artifactId, new Date("2029-01-01T00:00:00.000Z"), secret),
    { artifactId, expiresAt: expiresAt.toISOString() },
  );
  assert.equal(
    verifyArtifactToken(token, "art_123e4567-e89b-12d3-a456-426614174001", new Date("2029-01-01T00:00:00.000Z"), secret),
    undefined,
  );
  assert.equal(verifyPreviewToken(token, previewId, new Date("2029-01-01T00:00:00.000Z"), secret), undefined);
});
