import { createPostgresAgentExtensionStoreFromEnvironment } from "@/server/data/agent-extension-store";
import { listAgentExtensions } from "@/server/http/agent-extension-routes";

export const runtime = "nodejs";

const store = createPostgresAgentExtensionStoreFromEnvironment();

export async function GET(request: Request): Promise<Response> {
  return listAgentExtensions(request, { store });
}
