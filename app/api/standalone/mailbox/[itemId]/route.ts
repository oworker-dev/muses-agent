import {
  cancelAgentMailboxItemHttp,
  inspectAgentMailboxItemHttp,
  retryAgentMailboxItemHttp,
} from "@/server/agent-mailbox/item-http";
import { createPostgresAgentMailboxStoreFromEnvironment } from "@/server/data/agent-mailbox-store";
import { authenticateStandaloneRequest } from "@/server/http/standalone-request-auth";

export const runtime = "nodejs";

const store = createPostgresAgentMailboxStoreFromEnvironment();
type RouteContext = { readonly params: Promise<{ readonly itemId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return await handle(request, context, inspectAgentMailboxItemHttp);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return await handle(request, context, cancelAgentMailboxItemHttp);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return await handle(request, context, retryAgentMailboxItemHttp);
}

async function handle(
  request: Request,
  context: RouteContext,
  operation: typeof inspectAgentMailboxItemHttp,
): Promise<Response> {
  const authenticated = authenticateStandaloneRequest(request);
  if (!store) {
    return Response.json(
      { code: "agent_database_unavailable", error: "AGENT_DATABASE_URL is not configured.", ok: false },
      { status: 503 },
    );
  }
  const { itemId } = await context.params;
  return await operation({
    itemId,
    owner: authenticated.identity,
    ...(authenticated.setCookie ? { setCookie: authenticated.setCookie } : {}),
    store,
  });
}
