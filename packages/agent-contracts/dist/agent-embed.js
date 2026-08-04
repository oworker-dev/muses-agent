import { parseAgentRuntimeConfigSnapshot, } from "./runtime-config.js";
export const AGENT_EMBED_CONTRACT_VERSION = "0.1.0";
export function parseAgentEmbedEvent(value) {
    if (!isRecord(value) || value.contractVersion !== AGENT_EMBED_CONTRACT_VERSION) {
        return undefined;
    }
    if (value.type === "agent.embed.ready")
        return value;
    if (value.type === "agent.embed.configured" &&
        isText(value.requestId, 200)) {
        return value;
    }
    if (value.type === "agent.embed.error" &&
        (value.requestId === undefined || isText(value.requestId, 200)) &&
        isText(value.code, 200) &&
        isText(value.message, 4_000)) {
        return value;
    }
    if ((value.type === "agent.embed.turn-started" ||
        value.type === "agent.embed.turn-completed" ||
        value.type === "agent.embed.turn-failed" ||
        value.type === "agent.embed.turn-cancelled") &&
        isText(value.turnId, 200) &&
        (value.message === undefined || isText(value.message, 4_000))) {
        return value;
    }
    if (value.type === "agent.embed.host-capability-completed" &&
        isText(value.capability, 200) &&
        isJsonValue(value.output)) {
        return value;
    }
    return undefined;
}
export function parseAgentEmbedHostMessage(value) {
    if (!isRecord(value))
        return undefined;
    if (value.type !== "agent.embed.configure" ||
        value.contractVersion !== AGENT_EMBED_CONTRACT_VERSION ||
        !isText(value.requestId, 200) ||
        !isText(value.accessToken, 16_384) ||
        !isIsoDate(value.expiresAt) ||
        !isHttpUrl(value.serviceUrl) ||
        !isText(value.storageKey, 200) ||
        !isRecord(value.profile) ||
        !isText(value.profile.id, 120) ||
        !isText(value.profile.version, 80)) {
        return undefined;
    }
    if (value.locale !== undefined && value.locale !== "en" && value.locale !== "zh-CN" ||
        value.theme !== undefined && value.theme !== "dark" && value.theme !== "light" && value.theme !== "system") {
        return undefined;
    }
    if (value.runtimeConfig !== undefined) {
        try {
            parseAgentRuntimeConfigSnapshot(value.runtimeConfig);
        }
        catch {
            return undefined;
        }
    }
    return value;
}
export function isAllowedAgentEmbedParentOrigin(referrer, allowedOrigins) {
    let origin;
    try {
        origin = new URL(referrer).origin;
    }
    catch {
        return undefined;
    }
    return allowedOrigins.includes(origin) ? origin : undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value, maximum) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}
function isJsonValue(value, depth = 0) {
    if (depth > 20)
        return false;
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number" && Number.isFinite(value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.length <= 10_000 && value.every((item) => isJsonValue(item, depth + 1));
    }
    if (!isRecord(value) || Object.keys(value).length > 10_000)
        return false;
    return Object.values(value).every((item) => isJsonValue(item, depth + 1));
}
function isIsoDate(value) {
    return isText(value, 64) && Number.isFinite(Date.parse(value));
}
function isHttpUrl(value) {
    if (!isText(value, 2_048))
        return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=agent-embed.js.map