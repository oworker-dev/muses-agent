import { deleteAgentSession, AgentSessionDeletionError } from "@/server/agent-sessions/service";
import { createPostgresSessionOwnershipStoreFromEnvironment } from "@/server/data/session-ownership-store";
import { createPostgresSandboxDeletionStoreFromEnvironment } from "@/server/data/sandbox-deletion-store";
import { authenticateHostRequest } from "@/server/http/host-request-auth";

export const runtime = "nodejs";

const ownershipStore = createPostgresSessionOwnershipStoreFromEnvironment();
const deletionStore = createPostgresSandboxDeletionStoreFromEnvironment();
type RouteContext = { readonly params: Promise<{ readonly sessionId: string }> };

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const authenticated = await authenticateHostRequest(request);
  if (!authenticated.ok) return authenticated.response;
  if (!ownershipStore || !deletionStore) return databaseUnavailable();
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8 * 1024) {
    return problem(413, "request_too_large", "The session deletion request is too large.");
  }

  const { sessionId } = await context.params;
  try {
    const outcome = await deleteAgentSession({
      accessToken: authenticated.accessToken,
      deletionStore,
      identity: authenticated.identity,
      ownershipStore,
      sessionId,
    });
    return outcome
      ? Response.json({ deletion: outcome.deletion, disposition: outcome.disposition, ok: true, reset: outcome.reset }, {
          headers: { "cache-control": "no-store" },
          status: 202,
        })
      : problem(404, "agent_session_not_found", "The Agent session was not found for this principal.");
  } catch (error) {
    return error instanceof AgentSessionDeletionError
      ? problem(error.status, error.code, error.message)
      : problem(502, "agent_session_deletion_failed", "The Agent session could not be deleted.");
  }
}

function databaseUnavailable(): Response {
  return problem(503, "agent_database_unavailable", "AGENT_DATABASE_URL is not configured for this deployment.");
}

function problem(status: number, code: string, message: string): Response {
  return Response.json(
    { code, error: message, ok: false },
    { headers: { "cache-control": "no-store" }, status },
  );
}
