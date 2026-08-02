import {
  parseThreadCollection,
  type AgentThreadCollection,
  type AgentThreadStorage,
} from "./thread-storage.js";

export type HttpAgentThreadStorageOptions = {
  readonly endpoint?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly getAccessToken: () => string | Promise<string>;
};

export class AgentThreadStorageConflictError extends Error {
  readonly currentRevision?: number;
  readonly expectedRevision: number;

  constructor(
    expectedRevision: number,
    currentRevision?: number,
  ) {
    super("The Agent thread collection changed in another client.");
    this.name = "AgentThreadStorageConflictError";
    this.currentRevision = currentRevision;
    this.expectedRevision = expectedRevision;
  }
}

export class AgentThreadStorageHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AgentThreadStorageHttpError";
    this.status = status;
  }
}

export function createHttpAgentThreadStorage(
  options: HttpAgentThreadStorageOptions,
): AgentThreadStorage {
  const endpoint = (options.endpoint ?? "/api/agent/thread-collections").replace(/\/$/, "");
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const revisions = new Map<string, number>();

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
      const response = await request(
        fetchImplementation,
        options,
        collectionUrl(endpoint, storageKey),
        {
          body: JSON.stringify({ collection }),
          headers: {
            "content-type": "application/json",
            "if-match": `"${expectedRevision}"`,
          },
          method: "PUT",
        },
      );
      if (response.status === 409) {
        throw new AgentThreadStorageConflictError(
          expectedRevision,
          revisionFromEtag(response.headers.get("etag")),
        );
      }
      await requireOk(response);
      const body = await readCollectionResponse(response);
      revisions.set(storageKey, body.revision);
    },
  };
}

async function request(
  fetchImplementation: typeof globalThis.fetch,
  options: HttpAgentThreadStorageOptions,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const accessToken = await options.getAccessToken();
  if (!accessToken.trim()) throw new Error("Agent thread storage access token is empty.");
  return await fetchImplementation(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...init?.headers,
      authorization: `Bearer ${accessToken}`,
    },
  });
}

async function requireOk(response: Response): Promise<void> {
  if (response.ok) return;
  let message = `Agent thread storage request failed with status ${response.status}.`;
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") message = body.error;
  } catch {
    // Preserve the status-based message when the server did not return JSON.
  }
  throw new AgentThreadStorageHttpError(response.status, message);
}

async function readCollectionResponse(response: Response): Promise<{
  readonly collection: AgentThreadCollection;
  readonly revision: number;
}> {
  const body = await response.json() as { collection?: unknown; revision?: unknown };
  if (!Number.isSafeInteger(body.revision) || (body.revision as number) < 0) {
    throw new Error("Agent thread storage returned an invalid revision.");
  }
  const collection = parseThreadCollection(body.collection);
  return { collection, revision: body.revision as number };
}

function collectionUrl(endpoint: string, storageKey: string): string {
  return `${endpoint}/${encodeURIComponent(storageKey)}`;
}

function revisionFromEtag(value: string | null): number | undefined {
  const match = value ? /^(?:W\/)?"(\d+)"$/.exec(value.trim()) : undefined;
  const revision = match?.[1] ? Number(match[1]) : undefined;
  return Number.isSafeInteger(revision) ? revision : undefined;
}
