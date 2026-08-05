import "server-only";

import type { AgentRuntimeStatus } from "@oworker/open-agent-ui";

export function readAgentRuntimeStatus(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentRuntimeStatus {
  if (
    environment.AGENT_PROVIDER_MODE?.trim() === "mock" ||
    environment.AGENT_EVAL_FIXTURE_MODEL?.trim()
  ) {
    return { provider: "mock" };
  }
  if (!environment.OPENAI_API_KEY?.trim()) return { provider: "unconfigured" };
  const baseUrl = environment.OPENAI_BASE_URL?.trim();
  if (!baseUrl) return { provider: "ready" };
  try {
    const url = new URL(baseUrl);
    if (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1") &&
      url.port === "4291"
    ) {
      return { provider: "mock" };
    }
  } catch {
    return { provider: "unconfigured" };
  }
  return { provider: "ready" };
}
