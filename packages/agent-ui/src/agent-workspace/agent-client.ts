import { Client, type HeadersValue, type SessionState } from "eve/client";
import type { AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";

export function createAgentSession(
  config: AgentWorkspaceClientConfig | undefined,
  preferences: AgentThreadPreferences | (() => AgentThreadPreferences),
  state?: SessionState,
) {
  return new Client({
    auth: config?.auth,
    headers: async () => {
      const currentPreferences = typeof preferences === "function" ? preferences() : preferences;
      return {
        ...(await resolveHeaders(config?.headers)),
        "x-agent-execution-mode": currentPreferences.executionMode ?? "standard",
        "x-agent-model": currentPreferences.modelId,
        "x-agent-reasoning": currentPreferences.reasoning,
      };
    },
    host: config?.host ?? "",
    preserveCompletedSessions: true,
    redirect: config?.redirect,
  }).session(state);
}

async function resolveHeaders(headers: HeadersValue | undefined): Promise<Readonly<Record<string, string>>> {
  if (!headers) return {};
  return typeof headers === "function" ? await headers() : headers;
}
