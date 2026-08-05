import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;
const MAX_TTL_SECONDS = 60 * 60 * 24 * 7;

export type PreviewTokenClaims = {
  readonly expiresAt: string;
  readonly previewId: string;
};

export type ArtifactTokenClaims = {
  readonly artifactId: string;
  readonly expiresAt: string;
};

export function readPreviewSigningSecret(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = environment.AGENT_PREVIEW_SIGNING_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("AGENT_PREVIEW_SIGNING_SECRET must contain at least 32 characters.");
  }
  return value;
}

export function readPreviewTtlSeconds(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = environment.AGENT_PREVIEW_TTL_SECONDS?.trim();
  if (!configured) return DEFAULT_TTL_SECONDS;
  const value = Number(configured);
  if (!Number.isInteger(value) || value < 60 || value > MAX_TTL_SECONDS) {
    throw new Error("AGENT_PREVIEW_TTL_SECONDS must be an integer from 60 to 604800.");
  }
  return value;
}

export function createPreviewToken(
  previewId: string,
  expiresAt: Date,
  secret = readPreviewSigningSecret(),
): string {
  const normalizedId = assertPreviewId(previewId);
  const timestamp = expiresAt.toISOString();
  const payload = `${TOKEN_VERSION}.${normalizedId}.${timestamp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyPreviewToken(
  token: string,
  previewId: string,
  now = new Date(),
  secret = readPreviewSigningSecret(),
): PreviewTokenClaims | undefined {
  const normalizedId = assertPreviewId(previewId);
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION || parts[1] !== normalizedId) return undefined;
  const expiresAt = parts.slice(2, 4).join(".");
  const signature = parts[4];
  const payload = `${TOKEN_VERSION}.${normalizedId}.${expiresAt}`;
  if (!constantTimeEqual(signature, sign(payload, secret))) return undefined;
  const expiry = new Date(expiresAt);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime()) return undefined;
  return { expiresAt: expiry.toISOString(), previewId: normalizedId };
}

export function createArtifactToken(
  artifactId: string,
  expiresAt: Date,
  secret = readPreviewSigningSecret(),
): string {
  const normalizedId = assertArtifactId(artifactId);
  return signResourceToken(normalizedId, expiresAt, secret);
}

export function verifyArtifactToken(
  token: string,
  artifactId: string,
  now = new Date(),
  secret = readPreviewSigningSecret(),
): ArtifactTokenClaims | undefined {
  const normalizedId = assertArtifactId(artifactId);
  const claims = verifyResourceToken(token, normalizedId, now, secret);
  return claims ? { artifactId: normalizedId, expiresAt: claims.expiresAt } : undefined;
}

export function assertPreviewId(value: string): string {
  if (!/^prv_[a-f0-9-]{36}$/u.test(value)) throw new Error("Invalid preview id.");
  return value;
}

export function assertArtifactId(value: string): string {
  if (!/^art_[a-f0-9-]{36}$/u.test(value)) throw new Error("Invalid artifact id.");
  return value;
}

function signResourceToken(resourceId: string, expiresAt: Date, secret: string): string {
  const timestamp = expiresAt.toISOString();
  const payload = `${TOKEN_VERSION}.${resourceId}.${timestamp}`;
  return `${payload}.${sign(payload, secret)}`;
}

function verifyResourceToken(
  token: string,
  resourceId: string,
  now: Date,
  secret: string,
): PreviewTokenClaims | undefined {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION || parts[1] !== resourceId) return undefined;
  const expiresAt = parts.slice(2, 4).join(".");
  const signature = parts[4];
  const payload = `${TOKEN_VERSION}.${resourceId}.${expiresAt}`;
  if (!constantTimeEqual(signature, sign(payload, secret))) return undefined;
  const expiry = new Date(expiresAt);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime()) return undefined;
  return { expiresAt: expiry.toISOString(), previewId: resourceId };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
