import { AGENT_HOST_CAPABILITY_CONTRACT_VERSION, } from "@muses/agent-contracts/host-capability";
import { signAgentHostCapabilityRequest } from "./capability-signature.js";
export function createAgentHostCapabilityClient(options) {
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (typeof fetchImplementation !== "function")
        throw new Error("A Fetch API implementation is required.");
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
        throw new RangeError("Host capability timeout must be from 1000 to 120000 milliseconds.");
    }
    async function request(path, init) {
        const url = new URL(path.replace(/^\//, ""), `${baseUrl}/`);
        const body = init.body ? String(init.body) : "";
        const [identity, secret] = await Promise.all([resolve(options.identity), resolve(options.secret)]);
        const signedHeaders = signAgentHostCapabilityRequest({
            body,
            identity,
            method: init.method ?? "GET",
            secret,
            timestamp: options.now?.(),
            url,
        });
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
        const response = await fetchImplementation(url, {
            ...init,
            headers: {
                accept: "application/json",
                ...init.headers,
                ...signedHeaders,
                ...(body ? { "content-type": "application/json" } : {}),
            },
            redirect: "error",
            signal,
        });
        const payload = await response.json().catch(() => undefined);
        if (!response.ok) {
            throw new AgentHostCapabilityHttpError(response.status, errorMessage(payload) ?? `The Host capability service returned HTTP ${response.status}.`, payload);
        }
        return payload;
    }
    return {
        async list(requestOptions) {
            const payload = await request("capabilities", { method: "GET", signal: requestOptions?.signal });
            if (!isRecord(payload) ||
                payload.contractVersion !== AGENT_HOST_CAPABILITY_CONTRACT_VERSION ||
                !Array.isArray(payload.capabilities)) {
                throw contractError(payload);
            }
            return payload.capabilities;
        },
        async invoke(input, requestOptions) {
            const payload = await request("invoke", {
                body: JSON.stringify(input),
                method: "POST",
                signal: requestOptions?.signal,
            });
            if (!isRecord(payload) ||
                payload.contractVersion !== AGENT_HOST_CAPABILITY_CONTRACT_VERSION ||
                payload.capability !== input.capability ||
                !("output" in payload)) {
                throw contractError(payload);
            }
            return payload;
        },
    };
}
export class AgentHostCapabilityHttpError extends Error {
    status;
    body;
    constructor(status, message, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "AgentHostCapabilityHttpError";
    }
}
export class AgentHostCapabilityContractError extends Error {
    body;
    constructor(body) {
        super(`Host capability response does not match contract ${AGENT_HOST_CAPABILITY_CONTRACT_VERSION}.`);
        this.body = body;
        this.name = "AgentHostCapabilityContractError";
    }
}
function normalizeBaseUrl(value) {
    const normalized = value.trim().replace(/\/+$/, "");
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Host capability base URL must use HTTP or HTTPS.");
    }
    return normalized;
}
async function resolve(value) {
    return typeof value === "function" ? value() : value;
}
function contractError(body) {
    return new AgentHostCapabilityContractError(body);
}
function errorMessage(body) {
    if (!isRecord(body))
        return undefined;
    if (typeof body.message === "string" && body.message.trim())
        return body.message;
    if (typeof body.error === "string" && body.error.trim())
        return body.error;
    return undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=capability-client.js.map