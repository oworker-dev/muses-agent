import { createHmac, timingSafeEqual } from "node:crypto";
import type { AgentHostInvocationIdentity } from "@muses/agent-contracts/host";

export const AGENT_HOST_SIGNATURE_VERSION = "0.1.0" as const;
export const AGENT_HOST_HEADER = {
  actorType: "x-agent-host-actor-type",
  canvas: "x-agent-host-canvas",
  principal: "x-agent-host-principal",
  project: "x-agent-host-project",
  signature: "x-agent-host-signature",
  tenant: "x-agent-host-tenant",
  timestamp: "x-agent-host-timestamp",
} as const;

const DEFAULT_MAX_CLOCK_SKEW_MS = 60_000;

export type AgentHostSignatureInput = {
  readonly body?: string;
  readonly identity: AgentHostInvocationIdentity;
  readonly method: string;
  readonly secret: string;
  readonly timestamp?: number;
  readonly url: string | URL;
};

export type AgentHostSignatureVerificationInput = {
  readonly body?: string;
  readonly headers: Headers | HeadersInit;
  readonly maxClockSkewMs?: number;
  readonly method: string;
  readonly now?: number;
  readonly secret: string;
  readonly url: string | URL;
};

export function signAgentHostCapabilityRequest(input: AgentHostSignatureInput): Readonly<Record<string, string>> {
  assertSecret(input.secret);
  const timestamp = String(input.timestamp ?? Date.now());
  const method = normalizeMethod(input.method);
  const pathname = normalizeUrl(input.url).pathname;
  const body = input.body ?? "";
  const identity = validateIdentity(input.identity);
  return {
    [AGENT_HOST_HEADER.actorType]: identity.actorType,
    [AGENT_HOST_HEADER.principal]: identity.principalId,
    [AGENT_HOST_HEADER.signature]: signature(input.secret, timestamp, method, pathname, body),
    [AGENT_HOST_HEADER.tenant]: identity.tenantId,
    [AGENT_HOST_HEADER.timestamp]: timestamp,
    ...(identity.projectId ? { [AGENT_HOST_HEADER.project]: identity.projectId } : {}),
    ...(identity.canvasId ? { [AGENT_HOST_HEADER.canvas]: identity.canvasId } : {}),
  };
}

export function verifyAgentHostCapabilityRequest(
  input: AgentHostSignatureVerificationInput,
): AgentHostInvocationIdentity {
  assertSecret(input.secret);
  const headers = input.headers instanceof Headers ? input.headers : new Headers(input.headers);
  const timestamp = requiredHeader(headers, AGENT_HOST_HEADER.timestamp);
  const suppliedSignature = requiredHeader(headers, AGENT_HOST_HEADER.signature);
  if (!/^\d{10,16}$/.test(timestamp)) {
    throw authError("host-capability-auth-invalid", "The Host capability timestamp is invalid.");
  }
  const timestampMs = Number(timestamp);
  const maxClockSkewMs = input.maxClockSkewMs ?? DEFAULT_MAX_CLOCK_SKEW_MS;
  if (!Number.isSafeInteger(maxClockSkewMs) || maxClockSkewMs < 1_000 || maxClockSkewMs > 300_000) {
    throw new RangeError("Host capability clock skew must be from 1000 to 300000 milliseconds.");
  }
  if (!Number.isSafeInteger(timestampMs) || Math.abs((input.now ?? Date.now()) - timestampMs) > maxClockSkewMs) {
    throw authError("host-capability-auth-expired", "The Host capability request timestamp is expired.");
  }

  const method = normalizeMethod(input.method);
  const pathname = normalizeUrl(input.url).pathname;
  const expected = signature(input.secret, timestamp, method, pathname, input.body ?? "");
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    throw authError("host-capability-signature-invalid", "The Host capability signature is invalid.");
  }

  return validateIdentity({
    actorType: requiredHeader(headers, AGENT_HOST_HEADER.actorType) as "user" | "service",
    principalId: requiredHeader(headers, AGENT_HOST_HEADER.principal),
    tenantId: requiredHeader(headers, AGENT_HOST_HEADER.tenant),
    ...(optionalHeader(headers, AGENT_HOST_HEADER.project)
      ? { projectId: optionalHeader(headers, AGENT_HOST_HEADER.project) }
      : {}),
    ...(optionalHeader(headers, AGENT_HOST_HEADER.canvas)
      ? { canvasId: optionalHeader(headers, AGENT_HOST_HEADER.canvas) }
      : {}),
  });
}

export class AgentHostCapabilityAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "AgentHostCapabilityAuthError";
  }
}

function signature(secret: string, timestamp: string, method: string, pathname: string, body: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${method}.${pathname}.${body}`)
    .digest("base64url");
}

function validateIdentity(identity: AgentHostInvocationIdentity): AgentHostInvocationIdentity {
  if (!identity.tenantId?.trim() || !identity.principalId?.trim()) {
    throw authError("host-capability-auth-invalid", "Tenant and principal identity are required.");
  }
  if (identity.actorType !== "user" && identity.actorType !== "service") {
    throw authError("host-capability-actor-invalid", "The Host capability actor type is invalid.");
  }
  if (identity.canvasId && !identity.projectId) {
    throw authError("host-capability-project-required", "A Canvas scope requires a Project scope.");
  }
  return identity;
}

function assertSecret(secret: string) {
  if (secret.trim().length < 32) throw new Error("Host capability secret must contain at least 32 characters.");
}

function normalizeMethod(method: string) {
  const normalized = method.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalized)) throw new Error("Host capability HTTP method is invalid.");
  return normalized;
}

function normalizeUrl(value: string | URL) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url;
  } catch {
    throw new Error("Host capability URL must be an absolute HTTP(S) URL.");
  }
}

function requiredHeader(headers: Headers, name: string) {
  const value = optionalHeader(headers, name);
  if (!value) throw authError("host-capability-auth-invalid", "The Host capability authentication headers are incomplete.");
  return value;
}

function optionalHeader(headers: Headers, name: string) {
  const value = headers.get(name)?.trim();
  return value || undefined;
}

function authError(code: string, message: string) {
  return new AgentHostCapabilityAuthError(code, message);
}
