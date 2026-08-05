import { assertCredentialReference } from "../../lib/agent-extension-lifecycle.ts";
import { agentExtensionCatalogForConfig } from "../../lib/agent-extension-catalog.ts";
import type {
  AgentExtensionStore,
  AgentExtensionView,
} from "../data/agent-extension-store.ts";
import {
  authenticateHostRequest,
  type HostRequestAuthentication,
} from "./host-request-auth.ts";

const MAX_EXTENSION_REQUEST_BYTES = 8 * 1024;
const MANAGE_EXTENSIONS_SCOPE = "agent.extensions.manage";

export type AgentExtensionRouteDependencies = {
  readonly authenticate?: (request: Request) => Promise<HostRequestAuthentication>;
  readonly store: AgentExtensionStore | undefined;
};

export type AgentExtensionRouteParams = {
  readonly extensionId: string;
  readonly version: string;
};

export async function listAgentExtensions(
  request: Request,
  dependencies: AgentExtensionRouteDependencies,
): Promise<Response> {
  const authenticated = await authorize(request, dependencies.authenticate);
  if (!authenticated.ok) return authenticated.response;
  if (!dependencies.store) return databaseUnavailable();

  try {
    const extensions = await dependencies.store.list(
      authenticated.identity.tenantId,
      agentExtensionCatalogForConfig(authenticated.runtimeConfig),
    );
    return Response.json(
      { extensions: extensions.map(toPublicExtensionView), ok: true },
      { headers: noStoreHeaders() },
    );
  } catch {
    return problem(
      503,
      "agent_extension_catalog_unavailable",
      "The extension catalog could not be loaded.",
    );
  }
}

export async function enableAgentExtension(
  request: Request,
  params: AgentExtensionRouteParams,
  dependencies: AgentExtensionRouteDependencies,
): Promise<Response> {
  const authenticated = await authorize(request, dependencies.authenticate);
  if (!authenticated.ok) return authenticated.response;
  if (!dependencies.store) return databaseUnavailable();

  const parsed = await readEnableRequest(request);
  if (!parsed.ok) return parsed.response;

  try {
    const extension = await dependencies.store.enable(
      {
        actorId: authenticated.identity.principalId,
        ...(parsed.credentialRef ? { credentialRef: parsed.credentialRef } : {}),
        id: params.extensionId,
        tenantId: authenticated.identity.tenantId,
        version: params.version,
      },
      agentExtensionCatalogForConfig(authenticated.runtimeConfig),
    );
    return Response.json(
      { extension: toPublicExtensionView(extension), ok: true },
      { headers: noStoreHeaders() },
    );
  } catch {
    return problem(
      400,
      "agent_extension_enable_failed",
      "The extension could not be enabled with the supplied configuration.",
    );
  }
}

export async function revokeAgentExtension(
  request: Request,
  params: AgentExtensionRouteParams,
  dependencies: AgentExtensionRouteDependencies,
): Promise<Response> {
  const authenticated = await authorize(request, dependencies.authenticate);
  if (!authenticated.ok) return authenticated.response;
  if (!dependencies.store) return databaseUnavailable();

  try {
    const extension = await dependencies.store.revoke(
      {
        actorId: authenticated.identity.principalId,
        id: params.extensionId,
        tenantId: authenticated.identity.tenantId,
        version: params.version,
      },
      agentExtensionCatalogForConfig(authenticated.runtimeConfig),
    );
    return Response.json(
      { extension: toPublicExtensionView(extension), ok: true },
      { headers: noStoreHeaders() },
    );
  } catch {
    return problem(
      400,
      "agent_extension_revoke_failed",
      "The extension could not be revoked.",
    );
  }
}

async function authorize(
  request: Request,
  authenticate: AgentExtensionRouteDependencies["authenticate"] = authenticateHostRequest,
): Promise<HostRequestAuthentication> {
  const authenticated = await authenticate(request);
  if (!authenticated.ok) return authenticated;
  if (!authenticated.scopes.has(MANAGE_EXTENSIONS_SCOPE)) {
    return {
      ok: false,
      response: problem(
        403,
        "agent_extension_admin_required",
        "The token cannot manage Agent extensions.",
      ),
    };
  }
  return authenticated;
}

async function readEnableRequest(
  request: Request,
): Promise<
  | { readonly credentialRef?: string; readonly ok: true }
  | { readonly ok: false; readonly response: Response }
> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EXTENSION_REQUEST_BYTES) {
    return { ok: false, response: requestTooLarge() };
  }

  const text = await request.text().catch(() => undefined);
  if (text === undefined) {
    return {
      ok: false,
      response: problem(400, "invalid_extension_request", "The request body could not be read."),
    };
  }
  if (Buffer.byteLength(text) > MAX_EXTENSION_REQUEST_BYTES) {
    return { ok: false, response: requestTooLarge() };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: problem(400, "invalid_extension_request", "The request body must be valid JSON."),
    };
  }
  if (!isRecord(body) || Object.keys(body).some((key) => key !== "credentialRef")) {
    return {
      ok: false,
      response: problem(
        400,
        "invalid_extension_request",
        "Only an optional credentialRef is accepted.",
      ),
    };
  }
  if (body.credentialRef !== undefined && typeof body.credentialRef !== "string") {
    return {
      ok: false,
      response: problem(400, "invalid_extension_request", "credentialRef must be a string."),
    };
  }
  if (typeof body.credentialRef === "string") {
    try {
      assertCredentialReference(body.credentialRef);
    } catch {
      return {
        ok: false,
        response: problem(
          400,
          "invalid_extension_credential_reference",
          "credentialRef must be an opaque vault:// or vercel-connect:// reference.",
        ),
      };
    }
    return { credentialRef: body.credentialRef, ok: true };
  }
  return { ok: true };
}

function toPublicExtensionView(extension: AgentExtensionView) {
  return {
    credentialConfigured: extension.credentialConfigured,
    credentialMode: extension.credentialMode,
    defaultTenantStatus: extension.defaultTenantStatus,
    description: extension.description,
    effectiveStatus: extension.effectiveStatus,
    explicitlyConfigured: extension.explicitlyConfigured,
    id: extension.id,
    kind: extension.kind,
    requiredPermissions: extension.requiredPermissions,
    status: extension.status,
    ...(extension.updatedAt ? { updatedAt: extension.updatedAt } : {}),
    version: extension.version,
  };
}

function databaseUnavailable(): Response {
  return problem(503, "agent_database_unavailable", "AGENT_DATABASE_URL is not configured.");
}

function requestTooLarge(): Response {
  return problem(413, "request_too_large", "The extension request exceeds 8 KiB.");
}

function noStoreHeaders(): HeadersInit {
  return { "cache-control": "no-store" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function problem(status: number, code: string, message: string): Response {
  return Response.json(
    { code, message, ok: false },
    { headers: noStoreHeaders(), status },
  );
}
