import type { AgentThreadCollection } from "@oworker/open-agent-ui/agent-workspace";
import { parseThreadCollection } from "@oworker/open-agent-ui/agent-workspace";
import { createPostgresThreadCollectionStoreFromEnvironment } from "@/server/data/thread-collection-store";
import { authenticateStandaloneRequest } from "@/server/http/standalone-request-auth";

export const runtime = "nodejs";

const MAX_COLLECTION_BYTES = 5 * 1024 * 1024;
const store = createPostgresThreadCollectionStoreFromEnvironment<AgentThreadCollection>();

type RouteContext = { readonly params: Promise<{ readonly storageKey: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const authenticated = authenticateStandaloneRequest(request);
  if (!store) return databaseUnavailable(authenticated.setCookie);

  const { storageKey } = await context.params;
  const record = await store.load(
    authenticated.identity.tenantId,
    authenticated.identity.principalId,
    storageKey,
  );
  const collection = record?.collection ?? { threads: [], version: 1 };
  const revision = record?.revision ?? 0;
  return Response.json(
    { collection, revision },
    { headers: responseHeaders(revision, authenticated.setCookie) },
  );
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const authenticated = authenticateStandaloneRequest(request);
  if (!store) return databaseUnavailable(authenticated.setCookie);

  const expectedRevision = parseExpectedRevision(request.headers.get("if-match"));
  if (expectedRevision === undefined) {
    return problem(428, "revision_required", "If-Match must contain the loaded collection revision.", authenticated.setCookie);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_COLLECTION_BYTES) {
    return problem(413, "collection_too_large", "The thread collection exceeds 5 MiB.", authenticated.setCookie);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return problem(400, "invalid_json", "The request body must be valid JSON.", authenticated.setCookie);
  }
  if (!isRecord(input) || !("collection" in input)) {
    return problem(400, "invalid_collection", "The request must contain a thread collection.", authenticated.setCookie);
  }
  const serialized = JSON.stringify(input.collection);
  if (Buffer.byteLength(serialized) > MAX_COLLECTION_BYTES) {
    return problem(413, "collection_too_large", "The thread collection exceeds 5 MiB.", authenticated.setCookie);
  }
  const collection = parseStrictThreadCollection(input.collection);
  if (!collection) {
    return problem(400, "invalid_collection", "The thread collection does not match version 1.", authenticated.setCookie);
  }

  const { storageKey } = await context.params;
  const result = await store.save(
    authenticated.identity.tenantId,
    authenticated.identity.principalId,
    storageKey,
    expectedRevision,
    collection,
  );
  if (result.status === "conflict") {
    return problem(
      409,
      "thread_collection_conflict",
      "The thread collection changed in another client.",
      authenticated.setCookie,
      responseHeaders(result.currentRevision),
    );
  }
  return Response.json(
    { collection: result.record.collection, revision: result.record.revision },
    { headers: responseHeaders(result.record.revision, authenticated.setCookie) },
  );
}

function parseStrictThreadCollection(value: unknown): AgentThreadCollection | undefined {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.threads)) return undefined;
  const parsed = parseThreadCollection(value);
  return parsed.threads.length === value.threads.length ? parsed : undefined;
}

function parseExpectedRevision(value: string | null): number | undefined {
  if (!value) return undefined;
  const match = /^(?:W\/)?"(\d+)"$/.exec(value.trim());
  if (!match?.[1]) return undefined;
  const revision = Number(match[1]);
  return Number.isSafeInteger(revision) ? revision : undefined;
}

function responseHeaders(revision: number, setCookie?: string): HeadersInit {
  return {
    "cache-control": "no-store",
    etag: `"${revision}"`,
    ...(setCookie ? { "set-cookie": setCookie } : {}),
  };
}

function databaseUnavailable(setCookie?: string): Response {
  return problem(
    503,
    "agent_database_unavailable",
    "AGENT_DATABASE_URL is not configured for this deployment.",
    setCookie,
  );
}

function problem(
  status: number,
  code: string,
  message: string,
  setCookie?: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { code, error: message, ok: false },
    {
      status,
      headers: {
        "cache-control": "no-store",
        ...(setCookie ? { "set-cookie": setCookie } : {}),
        ...headers,
      },
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
