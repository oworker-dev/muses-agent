import { createHmac, timingSafeEqual } from "node:crypto";
export const AGENT_HOST_SIGNATURE_VERSION = "0.2.0";
export const AGENT_HOST_HEADER = {
    actorType: "x-agent-host-actor-type",
    principal: "x-agent-host-principal",
    scope: "x-agent-host-scope",
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
        ...(identity.scope ? { [AGENT_HOST_HEADER.scope]: encodeScope(identity.scope) } : {}),
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
        ...(optionalHeader(headers, AGENT_HOST_HEADER.scope)
            ? { scope: decodeScope(optionalHeader(headers, AGENT_HOST_HEADER.scope)) }
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
    const scope = normalizeScope(identity.scope);
    return {
        actorType: identity.actorType,
        principalId,
        tenantId,
        ...(scope ? { scope } : {}),
    };
}
function canonicalIdentity(identity) {
    return Buffer.from(JSON.stringify([
        identity.tenantId,
        identity.principalId,
        identity.actorType,
        identity.scope ?? {},
    ]), "utf8").toString("base64url");
}
function normalizeScope(value) {
    if (value === undefined)
        return undefined;
    const entries = Object.entries(value).map(([key, item]) => {
        if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(key)) {
            throw authError("host-capability-scope-invalid", "Host capability scope keys are invalid.");
        }
        const normalized = normalizeIdentityText(item);
        if (!normalized)
            throw authError("host-capability-scope-invalid", "Host capability scope values are invalid.");
        return [key, normalized];
    });
    if (entries.length > 32)
        throw authError("host-capability-scope-invalid", "Host capability scope is too large.");
    return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}
function encodeScope(scope) {
    return Buffer.from(JSON.stringify(normalizeScope(scope) ?? {}), "utf8").toString("base64url");
}
function decodeScope(value) {
    if (value.length > 8_192)
        throw authError("host-capability-scope-invalid", "Host capability scope is too large.");
    try {
        const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        if (!isStringRecord(decoded))
            throw new Error();
        const normalized = normalizeScope(decoded);
        if (!normalized)
            throw new Error();
        return normalized;
    }
    catch (error) {
        if (error instanceof AgentHostCapabilityAuthError)
            throw error;
        throw authError("host-capability-scope-invalid", "Host capability scope is invalid.");
    }
}
function isStringRecord(value) {
    return Boolean(value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every((item) => typeof item === "string"));
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