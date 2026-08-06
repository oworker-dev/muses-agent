import {
  createPreviewToken,
  verifyPreviewToken,
  type PreviewTokenClaims,
} from "../../lib/preview-token.ts";
import type { PreviewRecord } from "../data/preview-store.ts";
import { resolveStandaloneRequestIdentity } from "./standalone-request-auth.ts";

const PREVIEW_ACCESS_COOKIE = "open_agent_preview_access";
const MAX_COOKIE_VALUE_LENGTH = 1_024;

export type PreviewRequestAccess = {
  readonly claims: PreviewTokenClaims;
  readonly setCookie?: string;
};

/**
 * The entrypoint carries the signed token in its query string. Once verified,
 * a path-scoped HttpOnly cookie authorizes relative CSS, JS, fonts, and media
 * requests made by that document without exposing the token to page scripts.
 */
export function authenticatePreviewRequest(
  request: Request,
  previewId: string,
  now = new Date(),
  secret?: string,
): PreviewRequestAccess | undefined {
  const queryToken = new URL(request.url).searchParams.get("token");
  const token = queryToken ?? readCookie(request.headers.get("cookie"), PREVIEW_ACCESS_COOKIE);
  if (!token || token.length > MAX_COOKIE_VALUE_LENGTH) return undefined;
  const claims = verifyPreviewToken(token, previewId, now, secret);
  if (!claims) return undefined;
  return {
    claims,
    ...(queryToken ? { setCookie: serializeAccessCookie(request, token, claims, now) } : {}),
  };
}

/**
 * A standalone browser may recover its own unexpired preview after an operator
 * rotates or repairs the deployment signing key. Shared links still require a
 * valid bearer token.
 */
export function recoverOwnedPreviewRequest(
  request: Request,
  preview: PreviewRecord,
  now = new Date(),
  secret?: string,
): PreviewRequestAccess | undefined {
  const identity = resolveStandaloneRequestIdentity(request);
  if (!identity ||
    identity.tenantId !== preview.tenantId ||
    identity.principalId !== preview.principalId ||
    Date.parse(preview.expiresAt) <= now.getTime()) {
    return undefined;
  }
  const token = createPreviewToken(preview.previewId, new Date(preview.expiresAt), secret);
  const claims = verifyPreviewToken(token, preview.previewId, now, secret);
  if (!claims) return undefined;
  return { claims, setCookie: serializeAccessCookie(request, token, claims, now) };
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator <= 0 || item.slice(0, separator).trim() !== name) continue;
    const value = item.slice(separator + 1).trim();
    if (!value || value.length > MAX_COOKIE_VALUE_LENGTH) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function serializeAccessCookie(
  request: Request,
  token: string,
  claims: PreviewTokenClaims,
  now: Date,
): string {
  const expiresAt = new Date(claims.expiresAt);
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1_000));
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
  return [
    `${PREVIEW_ACCESS_COOKIE}=${encodeURIComponent(token)}`,
    `Path=/api/previews/${encodeURIComponent(claims.previewId)}/`,
    `Max-Age=${maxAge}`,
    `Expires=${expiresAt.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
