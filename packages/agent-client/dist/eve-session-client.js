import { Client, } from "eve/client";
import { AGENT_SESSION_CONTRACT_VERSION, } from "@oworker/open-agent-contracts/agent-session";
export const EVE_AGENT_SESSION_ADAPTER_VERSION = "0.1.0-alpha.9";
/**
 * Default interactive-session adapter for Eve 0.27.x.
 *
 * The returned surface contains no Eve classes or event types. Hosts persist
 * the AgentSession cursor and can replace this adapter without changing UI
 * ownership or thread storage.
 */
export function createEveAgentSessionClient(options) {
    const client = new Client({
        auth: { bearer: options.getAccessToken },
        headers: options.headers,
        host: normalizeBaseUrl(options.baseUrl),
        preserveCompletedSessions: true,
        redirect: options.redirect ?? "error",
    });
    return {
        session(cursor) {
            return new EveAgentSession(client.session(toEveCursor(cursor)));
        },
    };
}
class EveAgentSession {
    sessionHandle;
    constructor(sessionHandle) {
        this.sessionHandle = sessionHandle;
    }
    get cursor() {
        return fromEveCursor(this.sessionHandle.state);
    }
    async send(input) {
        const startCursor = this.cursor.eventCursor;
        const response = await this.sessionHandle.send(toEveSendInput(input));
        return new EveAgentSessionTurn(response, startCursor);
    }
    async *stream(options) {
        let cursor = options?.after ?? this.cursor.eventCursor;
        if (!Number.isSafeInteger(cursor) || cursor < 0) {
            throw new RangeError("Agent session event cursor must be a non-negative safe integer.");
        }
        for await (const event of this.sessionHandle.stream({
            follow: options?.follow,
            signal: options?.signal,
            startIndex: cursor,
        })) {
            cursor += 1;
            yield projectSessionEvent(event, cursor);
        }
    }
    async cancel(options) {
        return this.sessionHandle.cancel(options);
    }
    async reset() {
        return this.sessionHandle.reset();
    }
}
class EveAgentSessionTurn {
    response;
    startCursor;
    continuationToken;
    sessionId;
    consumed = false;
    constructor(response, startCursor) {
        this.response = response;
        this.startCursor = startCursor;
        this.continuationToken = response.continuationToken;
        this.sessionId = response.sessionId;
    }
    async result() {
        this.assertUnconsumed();
        this.consumed = true;
        const result = await this.response.result();
        return {
            data: result.data,
            events: result.events.map((event, index) => projectSessionEvent(event, this.startCursor + index + 1)),
            inputRequests: result.inputRequests,
            message: result.message,
            sessionId: result.sessionId,
            status: result.status,
        };
    }
    async *[Symbol.asyncIterator]() {
        this.assertUnconsumed();
        this.consumed = true;
        let cursor = this.startCursor;
        for await (const event of this.response) {
            cursor += 1;
            yield projectSessionEvent(event, cursor);
        }
    }
    assertUnconsumed() {
        if (this.consumed)
            throw new Error("AgentSessionTurn has already been consumed.");
    }
}
function toEveCursor(cursor) {
    if (!cursor)
        return undefined;
    if (!Number.isSafeInteger(cursor.eventCursor) || cursor.eventCursor < 0) {
        throw new RangeError("Agent session event cursor must be a non-negative safe integer.");
    }
    return {
        ...(cursor.continuationToken ? { continuationToken: cursor.continuationToken } : {}),
        ...(cursor.sessionId ? { sessionId: cursor.sessionId } : {}),
        streamIndex: cursor.eventCursor,
    };
}
function fromEveCursor(cursor) {
    return {
        ...(cursor.continuationToken ? { continuationToken: cursor.continuationToken } : {}),
        ...(cursor.sessionId ? { sessionId: cursor.sessionId } : {}),
        eventCursor: cursor.streamIndex,
    };
}
function toEveSendInput(input) {
    if (typeof input === "string")
        return input;
    return input;
}
function projectSessionEvent(event, cursor) {
    const candidate = event;
    return {
        contractVersion: AGENT_SESSION_CONTRACT_VERSION,
        cursor,
        ...(candidate.data === undefined ? {} : { data: candidate.data }),
        ...(candidate.meta === undefined ? {} : { meta: candidate.meta }),
        type: candidate.type,
    };
}
function normalizeBaseUrl(value) {
    const normalized = value.trim().replace(/\/+$/, "");
    if (!normalized)
        throw new Error("Agent service base URL is required.");
    let url;
    try {
        url = new URL(normalized);
    }
    catch {
        throw new Error("Agent service base URL must be an absolute HTTP(S) URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Agent service base URL must use HTTP or HTTPS.");
    }
    return normalized;
}
//# sourceMappingURL=eve-session-client.js.map