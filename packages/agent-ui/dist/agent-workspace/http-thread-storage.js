import { parseThreadCollection, } from "./thread-storage.js";
export class AgentThreadStorageConflictError extends Error {
    currentRevision;
    expectedRevision;
    constructor(expectedRevision, currentRevision) {
        super("The Agent thread collection changed in another client.");
        this.name = "AgentThreadStorageConflictError";
        this.currentRevision = currentRevision;
        this.expectedRevision = expectedRevision;
    }
}
export class AgentThreadStorageHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = "AgentThreadStorageHttpError";
        this.status = status;
    }
}
export function createHttpAgentThreadStorage(options) {
    const endpoint = (options.endpoint ?? "/api/agent/thread-collections").replace(/\/$/, "");
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    const revisions = new Map();
    return {
        async load(storageKey) {
            const response = await request(fetchImplementation, options, collectionUrl(endpoint, storageKey));
            await requireOk(response);
            const body = await readCollectionResponse(response);
            revisions.set(storageKey, body.revision);
            return body.collection;
        },
        async save(storageKey, collection) {
            const expectedRevision = revisions.get(storageKey);
            if (expectedRevision === undefined) {
                throw new Error("Agent thread storage must be loaded before it can be saved.");
            }
            const response = await request(fetchImplementation, options, collectionUrl(endpoint, storageKey), {
                body: JSON.stringify({ collection }),
                headers: {
                    "content-type": "application/json",
                    "if-match": `"${expectedRevision}"`,
                },
                method: "PUT",
            });
            if (response.status === 409) {
                throw new AgentThreadStorageConflictError(expectedRevision, revisionFromEtag(response.headers.get("etag")));
            }
            await requireOk(response);
            const body = await readCollectionResponse(response);
            revisions.set(storageKey, body.revision);
        },
    };
}
async function request(fetchImplementation, options, url, init) {
    const accessToken = await options.getAccessToken?.();
    if (accessToken !== undefined && !accessToken.trim()) {
        throw new Error("Agent thread storage access token is empty.");
    }
    return await fetchImplementation(url, {
        ...init,
        credentials: "same-origin",
        headers: {
            ...init?.headers,
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
    });
}
async function requireOk(response) {
    if (response.ok)
        return;
    let message = `Agent thread storage request failed with status ${response.status}.`;
    try {
        const body = await response.json();
        if (typeof body.error === "string")
            message = body.error;
    }
    catch {
    }
    throw new AgentThreadStorageHttpError(response.status, message);
}
async function readCollectionResponse(response) {
    const body = await response.json();
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) {
        throw new Error("Agent thread storage returned an invalid revision.");
    }
    const collection = parseThreadCollection(body.collection);
    return { collection, revision: body.revision };
}
function collectionUrl(endpoint, storageKey) {
    return `${endpoint}/${encodeURIComponent(storageKey)}`;
}
function revisionFromEtag(value) {
    const match = value ? /^(?:W\/)?"(\d+)"$/.exec(value.trim()) : undefined;
    const revision = match?.[1] ? Number(match[1]) : undefined;
    return Number.isSafeInteger(revision) ? revision : undefined;
}
//# sourceMappingURL=http-thread-storage.js.map