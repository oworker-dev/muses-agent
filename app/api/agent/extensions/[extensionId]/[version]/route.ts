import { createPostgresAgentExtensionStoreFromEnvironment } from "@/server/data/agent-extension-store";
import {
  enableAgentExtension,
  revokeAgentExtension,
} from "@/server/http/agent-extension-routes";

export const runtime = "nodejs";

const store = createPostgresAgentExtensionStoreFromEnvironment();
type RouteContext = {
  readonly params: Promise<{ readonly extensionId: string; readonly version: string }>;
};

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return enableAgentExtension(request, await context.params, { store });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return revokeAgentExtension(request, await context.params, { store });
}
