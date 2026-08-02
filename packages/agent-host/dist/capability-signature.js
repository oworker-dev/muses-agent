import { createHmac, timingSafeEqual } from "node:crypto";
export const AGENT_HOST_SIGNATURE_VERSION = "0.2.0";
export const AGENT_HOST_HEADER = {
    actorType: "x-agent-host-actor-type",
    canvas: "x-agent-host-canvas",
    principal: "x-agent-host-principal",
    project: "x-agent-host-project",
    signature: "x-agent-host-signature",
    tenant: "x-agent-host-tenant",
    timestamp: "x-agent-host-timestamp",
};
const DEFAULT_MAX_CLOCK_SKEW_MS = 60_000;
export function signAgentHostCapabilityRequest(input) {
    assertSecret(input.secret);
    const timestamp = String(input.timestamp ?? Date.now());
    const method = normalizeMethod(input.method);
    const pathname = normalizeUrl(input.url).pathname;
    const body = input.body ?? "";
    const identity = validateIdentity(input.identity);
    return {
        [AGENT_HOST_HEADER.actorType]: identity.actorType,
        [AGENT_HOST_HEADER.principal]: identity.principalId,
        [AGENT_HOST_HEADER.signature]: signature(input.secret, timestamp, method, pathname, body, identity),
        [AGENT_HOST_HEADER.tenant]: identity.tenantId,
        [AGENT_HOST_HEADER.timestamp]: timestamp,
        ...(identity.projectId ? { [AGENT_HOST_HEADER.project]: identity.projectId } : {}),
        ...(identity.canvasId ? { [AGENT_HOST_HEADER.canvas]: identity.canvasId } : {}),
    };
}
export function verifyAgentHostCapabilityRequest(input) {
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
    const identity = validateIdentity({
        actorType: requiredHeader(headers, AGENT_HOST_HEADER.actorType),
        principalId: requiredHeader(headers, AGENT_HOST_HEADER.principal),
        tenantId: requiredHeader(headers, AGENT_HOST_HEADER.tenant),
        ...(optionalHeader(headers, AGENT_HOST_HEADER.project)
            ? { projectId: optionalHeader(headers, AGENT_HOST_HEADER.project) }
            : {}),
        ...(optionalHeader(headers, AGENT_HOST_HEADER.canvas)
            ? { canvasId: optionalHeader(headers, AGENT_HOST_HEADER.canvas) }
            : {}),
    });
    const method = normalizeMethod(input.method);
    const pathname = normalizeUrl(input.url).pathname;
    const expected = signature(input.secret, timestamp, method, pathname, input.body ?? "", identity);
    const suppliedBytes = Buffer.from(suppliedSignature);
    const expectedBytes = Buffer.from(expected);
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
        throw authError("host-capability-signature-invalid", "The Host capability signature is invalid.");
    }
    return identity;
}
export class AgentHostCapabilityAuthError extends Error {
    code;
    status;
    constructor(code, message, status = 401) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = "AgentHostCapabilityAuthError";
    }
}
function signature(secret, timestamp, method, pathname, body, identity) {
    return createHmac("sha256", secret)
        .update(`${timestamp}.${method}.${pathname}.${canonicalIdentity(identity)}.${body}`)
        .digest("base64url");
}
function validateIdentity(identity) {
    const tenantId = normalizeIdentityText(identity.tenantId);
    const principalId = normalizeIdentityText(identity.principalId);
    if (!tenantId || !principalId) {
        throw authError("host-capability-auth-invalid", "Tenant and principal identity are required.");
    }
    if (identity.actorType !== "user" && identity.actorType !== "service") {
        throw authError("host-capability-actor-invalid", "The Host capability actor type is invalid.");
    }
    const projectId = normalizeIdentityText(identity.projectId);
    const canvasId = normalizeIdentityText(identity.canvasId);
    if (canvasId && !projectId) {
        throw authError("host-capability-project-required", "A Canvas scope requires a Project scope.");
    }
    return {
        actorType: identity.actorType,
        principalId,
        tenantId,
        ...(projectId ? { projectId } : {}),
        ...(canvasId ? { canvasId } : {}),
    };
}
function canonicalIdentity(identity) {
    return Buffer.from(JSON.stringify([
        identity.tenantId,
        identity.principalId,
        identity.actorType,
        identity.projectId ?? "",
        identity.canvasId ?? "",
    ]), "utf8").toString("base64url");
}
function normalizeIdentityText(value) {
    const normalized = value?.trim();
    if (!normalized)
        return undefined;
    if (normalized.length > 240) {
        throw authError("host-capability-auth-invalid", "Host capability identity fields are too long.");
    }
    return normalized;
}
function assertSecret(secret) {
    if (secret.trim().length < 32)
        throw new Error("Host capability secret must contain at least 32 characters.");
}
function normalizeMethod(method) {
    const normalized = method.trim().toUpperCase();
    if (!/^[A-Z]+$/.test(normalized))
        throw new Error("Host capability HTTP method is invalid.");
    return normalized;
}
function normalizeUrl(value) {
    try {
        const url = value instanceof URL ? value : new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:")
            throw new Error();
        return url;
    }
    catch {
        throw new Error("Host capability URL must be an absolute HTTP(S) URL.");
    }
}
function requiredHeader(headers, name) {
    const value = optionalHeader(headers, name);
    if (!value)
        throw authError("host-capability-auth-invalid", "The Host capability authentication headers are incomplete.");
    return value;
}
function optionalHeader(headers, name) {
    const value = headers.get(name)?.trim();
    return value || undefined;
}
function authError(code, message) {
    return new AgentHostCapabilityAuthError(code, message);
}
//# sourceMappingURL=capability-signature.js.map