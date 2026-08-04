import type { AgentThreadCollection } from "@oworker/open-agent-ui/agent-workspace";
import { parseThreadCollection } from "@oworker/open-agent-ui/agent-workspace";
import { createPostgresThreadCollectionStoreFromEnvironment } from "@/server/data/thread-collection-store";
import { authenticateHostRequest } from "@/server/http/host-request-auth";

export const runtime = "nodejs";

const MAX_COLLECTION_BYTES = 5 * 1024 * 1024;
const store = createPostgresThreadCollectionStoreFromEnvironment<AgentThreadCollection>();

type RouteContext = { readonly params: Promise<{ readonly storageKey: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const authenticated = await authenticateHostRequest(request);
  if (!authenticated.ok) return authenticated.response;
  if (!store) return databaseUnavailable();

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
    { headers: responseHeaders(revision) },
  );
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const authenticated = await authenticateHostRequest(request);
  if (!authenticated.ok) return authenticated.response;
  if (!store) return databaseUnavailable();

  const expectedRevision = parseExpectedRevision(request.headers.get("if-match"));
  if (expectedRevision === undefined) {
    return problem(428, "revision_required", "If-Match must contain the loaded collection revision.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_COLLECTION_BYTES) {
    return problem(413, "collection_too_large", "The thread collection exceeds 5 MiB.");
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return problem(400, "invalid_json", "The request body must be valid JSON.");
  }
  if (!isRecord(input) || !("collection" in input)) {
    return problem(400, "invalid_collection", "The request must contain a thread collection.");
  }
  const serialized = JSON.stringify(input.collection);
  if (Buffer.byteLength(serialized) > MAX_COLLECTION_BYTES) {
    return problem(413, "collection_too_large", "The thread collection exceeds 5 MiB.");
  }
  const collection = parseStrictThreadCollection(input.collection);
  if (!collection) {
    return problem(400, "invalid_collection", "The thread collection does not match version 1.");
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
      responseHeaders(result.currentRevision),
    );
  }
  return Response.json(
    { collection: result.record.collection, revision: result.record.revision },
    { headers: responseHeaders(result.record.revision) },
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

function responseHeaders(revision: number): HeadersInit {
  return { "cache-control": "no-store", etag: `"${revision}"` };
}

function databaseUnavailable(): Response {
  return problem(
    503,
    "agent_database_unavailable",
    "AGENT_DATABASE_URL is not configured for this deployment.",
  );
}

function problem(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { code, error: message, ok: false },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
