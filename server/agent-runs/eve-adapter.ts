import { Client, type MessageStreamEvent } from "eve/client";
import type { AgentRunPolicy } from "@oworker/open-agent-contracts/agent-run";
import type { ParsedStartAgentRun } from "./input";

const DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_EVENT_READ_LIMIT = 200;

export type EveAgentSessionRef = {
  readonly sessionId: string;
};

export type EveResetStatus = "no_active_session" | "reset";

export function isAgentRuntimeConfigured(): boolean {
  return Boolean(process.env.AGENT_RUNTIME_URL?.trim());
}

export async function startEveAgentRun(
  input: ParsedStartAgentRun,
  runId: string,
  accessToken: string,
): Promise<EveAgentSessionRef> {
  const created = await createClient(
    accessToken,
    runId,
    input.correlationId,
    input.profile,
    input.policy,
  ).sessions.create({
    ...(input.clientContext ? { clientContext: input.clientContext } : {}),
    message: input.message,
    ...(input.outputSchema ? { outputSchema: input.outputSchema } : {}),
    signal: AbortSignal.timeout(runtimeRequestTimeoutMs()),
    streamReconnectPolicy: { reconnect: false },
  });
  return { sessionId: created.response.sessionId };
}

export async function readEveAgentEvents(
  runId: string,
  correlationId: string,
  sessionId: string,
  accessToken: string,
  startIndex = 0,
  limit = DEFAULT_EVENT_READ_LIMIT,
): Promise<readonly MessageStreamEvent[]> {
  if (!Number.isSafeInteger(startIndex) || startIndex < 0) {
    throw new RangeError("Eve event start index must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError("Eve event read limit must be an integer from 1 to 1000.");
  }

  const session = createClient(accessToken, runId, correlationId).sessions.attach(
    sessionId,
    { streamIndex: startIndex },
  );
  const events: MessageStreamEvent[] = [];
  for await (const event of session.stream({
    follow: false,
    signal: AbortSignal.timeout(runtimeRequestTimeoutMs()),
    startIndex,
  })) {
    events.push(event);
    if (events.length >= limit) break;
  }
  return events;
}

export async function cancelEveAgentRun(
  runId: string,
  correlationId: string,
  sessionId: string,
  accessToken: string,
): Promise<"accepted" | "no_active_turn"> {
  const session = createClient(accessToken, runId, correlationId).sessions.attach(sessionId);
  return (await session.cancel()).status;
}

export async function resetEveAgentRun(
  runId: string,
  correlationId: string,
  sessionId: string,
  accessToken: string,
): Promise<EveResetStatus> {
  const session = createClient(accessToken, runId, correlationId).sessions.attach(sessionId);
  return (await session.reset()).status;
}

export async function resetEveSession(
  sessionId: string,
  accessToken: string,
  correlationId: string,
): Promise<EveResetStatus> {
  const session = createClient(accessToken, `sandbox-delete-${sessionId}`, correlationId).sessions.attach(sessionId);
  return (await session.reset()).status;
}

function createClient(
  accessToken: string,
  runId: string,
  correlationId: string,
  profile?: { readonly profileId: string; readonly version: string },
  policy?: AgentRunPolicy,
  query?: Readonly<Record<string, string>>,
): Client {
  const host = new URL(normalizeAgentRuntimeHost(process.env.AGENT_RUNTIME_URL));
  for (const [name, value] of Object.entries(query ?? {})) host.searchParams.set(name, value);
  const hostHeader = process.env.AGENT_RUNTIME_HOST_HEADER?.trim();
  return new Client({
    auth: { bearer: accessToken },
    headers: {
      ...(hostHeader ? { host: hostHeader } : {}),
      "x-agent-correlation-id": correlationId,
      "x-agent-run-id": runId,
      ...(profile
        ? {
            "x-agent-profile-id": profile.profileId,
            "x-agent-profile-version": profile.version,
          }
        : {}),
      ...(policy ? { "x-agent-run-policy": Buffer.from(JSON.stringify(policy)).toString("base64url") } : {}),
    },
    host: host.toString(),
    redirect: "error",
  });
}

export function normalizeAgentRuntimeHost(value: string | undefined): string {
  const configured = value?.trim();
  if (!configured) {
    throw new Error("AGENT_RUNTIME_URL is required for the headless AgentRun API.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("AGENT_RUNTIME_URL must be an absolute HTTP(S) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("AGENT_RUNTIME_URL must be an absolute HTTP(S) URL.");
  }

  // Eve Client appends /eve/v1 itself. Accept and repair the common endpoint-form
  // configuration so hosts never submit to /eve/v1/eve/v1/session.
  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/eve/v1")) {
    url.pathname = pathname.slice(0, -"/eve/v1".length) || "/";
  }
  url.hash = "";
  return url.toString();
}

function runtimeRequestTimeoutMs(): number {
  const value = process.env.AGENT_RUNTIME_REQUEST_TIMEOUT_MS?.trim();
  if (!value) return DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 120_000) {
    throw new Error("AGENT_RUNTIME_REQUEST_TIMEOUT_MS must be an integer from 1000 to 120000.");
  }
  return timeout;
}
