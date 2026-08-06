export class AgentMailboxHttpError extends Error {
    code;
    status;
    constructor(status, message, code) {
        super(message);
        this.name = "AgentMailboxHttpError";
        this.status = status;
        this.code = code;
    }
}
export function createHttpAgentMailbox(options) {
    const endpoint = (options.endpoint ?? "/api/agent/mailbox").replace(/\/$/, "");
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    return {
        async enqueue(input) {
            return await mutate(fetchImplementation, options, endpoint, {
                body: JSON.stringify(input),
                headers: { "content-type": "application/json" },
                method: "POST",
            });
        },
        async inspect(itemId) {
            return await mutate(fetchImplementation, options, itemUrl(endpoint, itemId));
        },
        async cancel(itemId) {
            return await mutate(fetchImplementation, options, itemUrl(endpoint, itemId), {
                method: "DELETE",
            });
        },
        async retry(itemId) {
            return await mutate(fetchImplementation, options, itemUrl(endpoint, itemId), {
                method: "PATCH",
            });
        },
    };
}
async function mutate(fetchImplementation, options, url, init) {
    const accessToken = await options.getAccessToken?.();
    if (accessToken !== undefined && !accessToken.trim()) {
        throw new Error("Agent mailbox access token is empty.");
    }
    const response = await fetchImplementation(url, {
        ...init,
        credentials: "same-origin",
        headers: {
            ...init?.headers,
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        redirect: "error",
    });
    const body = await readJson(response);
    if (!response.ok) {
        throw new AgentMailboxHttpError(response.status, typeof body.error === "string"
            ? body.error
            : `Agent mailbox request failed with status ${response.status}.`, typeof body.code === "string" ? body.code : undefined);
    }
    const item = body.item;
    if (!isRecord(item) ||
        typeof item.clientMessageId !== "string" ||
        typeof item.itemId !== "string" ||
        !isMailboxStatus(item.status))
        throw new Error("Agent mailbox returned an invalid item.");
    return {
        clientMessageId: item.clientMessageId,
        itemId: item.itemId,
        ...(typeof item.lastError === "string" ? { lastError: item.lastError } : {}),
        status: item.status,
    };
}
async function readJson(response) {
    try {
        const value = await response.json();
        return isRecord(value) ? value : {};
    }
    catch {
        return {};
    }
}
function itemUrl(endpoint, itemId) {
    return `${endpoint}/${encodeURIComponent(itemId)}`;
}
function isMailboxStatus(value) {
    return value === "accepted" || value === "cancelled" || value === "committed" ||
        value === "delivering" || value === "failed" || value === "queued" ||
        value === "submission-ambiguous";
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=http-agent-mailbox.js.map