import { timingSafeEqual } from "node:crypto";
import { createPostgresAgentMailboxStoreFromEnvironment } from "@/server/data/agent-mailbox-store";
import { createEveAgentMailboxRuntime } from "@/server/agent-mailbox/eve-runtime";
import { dispatchNextAgentMailboxMessage } from "@/server/agent-mailbox/service";

export const runtime = "nodejs";

const store = createPostgresAgentMailboxStoreFromEnvironment();

export async function POST(request: Request): Promise<Response> {
  if (!workerAuthorized(request)) {
    return problem(401, "mailbox_worker_unauthorized", "A valid mailbox worker credential is required.");
  }
  if (!store) {
    return problem(503, "agent_database_unavailable", "AGENT_DATABASE_URL is not configured.");
  }

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
  if (limit === undefined) {
    return problem(400, "mailbox_limit_invalid", "limit must be an integer from 1 to 20.");
  }
  const agentRuntime = createEveAgentMailboxRuntime();
  const outcomes = [];
  for (let index = 0; index < limit; index += 1) {
    const outcome = await dispatchNextAgentMailboxMessage({
      runtime: agentRuntime,
      store,
    });
    if (outcome.status === "idle") break;
    outcomes.push({ itemId: outcome.item.itemId, status: outcome.status });
  }
  return Response.json(
    { ok: true, outcomes, processed: outcomes.length },
    { headers: { "cache-control": "no-store" } },
  );
}

function workerAuthorized(request: Request): boolean {
  const secret = process.env.AGENT_MAILBOX_WORKER_SECRET?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  if (!secret || Buffer.byteLength(secret) < 32 || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  const candidate = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(secret);
  const candidateBytes = Buffer.from(candidate);
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}

function parseLimit(value: string | null): number | undefined {
  if (value === null || value === "") return 10;
  if (!/^\d+$/.test(value)) return undefined;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 20 ? limit : undefined;
}

function problem(status: number, code: string, error: string): Response {
  return Response.json(
    { code, error, ok: false },
    { headers: { "cache-control": "no-store" }, status },
  );
}
