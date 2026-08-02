import {
  createUnauthorizedResponse,
  extractBearerToken,
  type ForbiddenError,
  type UnauthenticatedError,
} from "eve/channels/auth";
import { hostJwtAuthFromEnvironment } from "../../agent/lib/host-auth.ts";
import { sessionOwnerFromAuth } from "../../agent/lib/session-ownership-auth.ts";
import type { AgentSessionOwner } from "../data/session-ownership-store.ts";

export type HostRequestAuthentication =
  | {
      readonly accessToken: string;
      readonly identity: AgentSessionOwner;
      readonly ok: true;
      readonly scopes: ReadonlySet<string>;
    }
  | { readonly ok: false; readonly response: Response };

export async function authenticateHostRequest(
  request: Request,
): Promise<HostRequestAuthentication> {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const auth = await hostJwtAuthFromEnvironment()(request);
    if (!auth || !accessToken) {
      return {
        ok: false,
        response: createUnauthorizedResponse({
          challenges: [{ scheme: "Bearer" }],
          code: "host_auth_required",
          message: "A valid Host access token is required.",
        }),
      };
    }
    return {
      accessToken,
      identity: sessionOwnerFromAuth(auth),
      ok: true,
      scopes: authScopes(auth.attributes.scope),
    };
  } catch (error) {
    if (hasAuthResponse(error)) return { ok: false, response: error.response };
    throw error;
  }
}

function authScopes(value: string | readonly string[] | undefined): ReadonlySet<string> {
  const scopes = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\s+/u) : [];
  return new Set(scopes.map((scope) => scope.trim()).filter(Boolean));
}

function hasAuthResponse(
  error: unknown,
): error is ForbiddenError | UnauthenticatedError {
  return error instanceof Error && "response" in error && error.response instanceof Response;
}
