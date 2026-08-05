import { ForbiddenError, type AuthFn } from "eve/channels/auth";
import type { SessionAuthContext } from "eve/context";
import type {
  AgentSessionOwner,
  AgentSessionOwnershipStore,
} from "../../server/data/session-ownership-store";

export function withSessionOwnership(
  authenticate: AuthFn<Request>,
  store: AgentSessionOwnershipStore,
): AuthFn<Request> {
  return async (request) => {
    const auth = await authenticate(request);
    if (!auth) return null;

    const sessionId = sessionIdFromRequest(request);
    if (!sessionId) return auth;

    const result = await store.waitForOwnership(sessionId, sessionOwnerFromAuth(auth));
    if (result !== "owned") {
      throw new ForbiddenError({
        code: result === "missing" ? "agent_session_not_found" : "agent_session_forbidden",
        message: "This authenticated principal cannot access the requested Agent session.",
      });
    }
    return auth;
  };
}

export function sessionOwnerFromAuth(auth: SessionAuthContext): AgentSessionOwner {
  const tenantId = auth.attributes.tenantId;
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new ForbiddenError({
      code: "tenant_scope_required",
      message: "A tenant-scoped authenticated principal is required.",
    });
  }
  return {
    ...(auth.issuer ? { issuer: auth.issuer } : {}),
    principalId: auth.principalId,
    principalType: auth.principalType,
    tenantId: tenantId.trim(),
  };
}

export function publicationOwnerFromAuth(
  auth: SessionAuthContext,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentSessionOwner {
  if (auth.principalType === "local-dev" && environment.NODE_ENV !== "production") {
    return {
      ...(auth.issuer ? { issuer: auth.issuer } : {}),
      principalId: auth.principalId,
      principalType: auth.principalType,
      tenantId: "local-dev",
    };
  }
  return sessionOwnerFromAuth(auth);
}

function sessionIdFromRequest(request: Request): string | undefined {
  const pathname = new URL(request.url).pathname;
  const match = /^\/eve\/v1\/session\/([^/]+)(?:\/|$)/.exec(pathname);
  if (!match?.[1]) return undefined;
  const sessionId = decodeURIComponent(match[1]);
  // `/session/reset` is a standard Eve route. Its identity is carried by the
  // continuation token body, so treating `reset` as a session ID would reject
  // every authenticated reset before Eve can validate that token.
  return sessionId === "reset" ? undefined : sessionId;
}
