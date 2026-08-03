import { Client, ClientError, type HandleMessageStreamEvent } from "eve/client";
import type { AgentRunPolicy } from "../../contracts/agent-run";
import type { ParsedStartAgentRun } from "./input";

const DEFAULT_RUNTIME_REQUEST_TIMEOUT_MS = 15_000;

export type EveAgentSessionRef = {
  readonly continuationToken: string;
  readonly sessionId: string;
};

export type EveResetStatus = "no_active_session" | "reset" | "unavailable";

export function isAgentRuntimeConfigured(): boolean {
  return Boolean(process.env.AGENT_RUNTIME_URL?.trim());
}

export async function startEveAgentRun(
  input: ParsedStartAgentRun,
  runId: string,
  accessToken: string,
): Promise<EveAgentSessionRef> {
  const session = createClient(
    accessToken,
    runId,
    input.correlationId,
    input.profile,
    input.policy,
  ).session();
  const response = await session.send({
    ...(input.clientContext ? { clientContext: input.clientContext } : {}),
    message: input.message,
    ...(input.outputSchema ? { outputSchema: input.outputSchema } : {}),
    signal: AbortSignal.timeout(runtimeRequestTimeoutMs()),
    streamReconnectPolicy: { reconnect: false },
  });
  if (!response.continuationToken) {
    throw new Error("The Eve runtime accepted a session without a continuation token.");
  }
  return {
    continuationToken: response.continuationToken,
    sessionId: response.sessionId,
  };
}

export async function readEveAgentEvents(
  runId: string,
  correlationId: string,
  sessionId: string,
  accessToken: string,
): Promise<readonly HandleMessageStreamEvent[]> {
  const stop = new AbortController();
  const signal = AbortSignal.any([AbortSignal.timeout(runtimeRequestTimeoutMs()), stop.signal]);
  try {
    const response = await createClient(
      accessToken,
      runId,
      correlationId,
      undefined,
      undefined,
      { includeTailIndex: "1", startIndex: "0" },
    ).fetch(
      `/eve/v1/session/${encodeURIComponent(sessionId)}/stream`,
      {
        cache: "no-store",
        redirect: "error",
        signal,
      },
    );
    if (!response.ok) {
      throw new ClientError(response.status, await response.text(), response.headers);
    }
    if (!response.body) {
      throw new Error("The Eve runtime returned an empty Agent event stream.");
    }
    const tailIndex = parseTailIndex(response.headers.get("x-eve-stream-tail-index"));
    if (tailIndex === undefined) {
      void response.body.cancel().catch(() => undefined);
      throw new Error("The Eve runtime did not return a valid bounded stream tail index.");
    }
    if (tailIndex < 0) {
      void response.body.cancel().catch(() => undefined);
      return [];
    }
    return await readBoundedNdjsonEvents(response.body, tailIndex, { signal });
  } finally {
    stop.abort();
  }
}

async function readBoundedNdjsonEvents(
  body: ReadableStream<Uint8Array>,
  tailIndex: number,
  options: { readonly signal: AbortSignal },
): Promise<readonly HandleMessageStreamEvent[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: HandleMessageStreamEvent[] = [];
  let buffer = "";
  let reachedEnd = false;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  options.signal.addEventListener("abort", abort, { once: true });
  try {
    while (!options.signal.aborted && events.length <= tailIndex) {
      const chunk = await reader.read();
      if (chunk.done) {
        reachedEnd = true;
        buffer += decoder.decode();
        buffer = consumeNdjsonLines(buffer, events, tailIndex);
        break;
      }
      if (chunk.value) buffer += decoder.decode(chunk.value, { stream: true });
      buffer = consumeNdjsonLines(buffer, events, tailIndex);
    }
    if (events.length <= tailIndex && buffer.trim()) {
      events.push(JSON.parse(buffer.trim()) as HandleMessageStreamEvent);
    }
    if (events.length <= tailIndex) {
      options.signal.throwIfAborted();
      throw new Error("The Eve Agent event stream ended before its declared durable tail.");
    }
    return events.slice(0, tailIndex + 1);
  } finally {
    options.signal.removeEventListener("abort", abort);
    if (!reachedEnd) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function consumeNdjsonLines(
  input: string,
  events: HandleMessageStreamEvent[],
  tailIndex: number,
): string {
  let buffer = input;
  let newline = buffer.indexOf("\n");
  while (newline >= 0 && events.length <= tailIndex) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) events.push(JSON.parse(line) as HandleMessageStreamEvent);
    newline = buffer.indexOf("\n");
  }
  return buffer;
}

function parseTailIndex(value: string | null): number | undefined {
  if (value === null || !/^-?\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= -1 ? parsed : undefined;
}

export async function cancelEveAgentRun(
  runId: string,
  correlationId: string,
  sessionId: string,
  accessToken: string,
): Promise<"accepted" | "no_active_turn"> {
  const session = createClient(accessToken, runId, correlationId).session({
    sessionId,
    streamIndex: 0,
  });
  return (await session.cancel()).status;
}

export async function resetEveAgentRun(
  runId: string,
  correlationId: string,
  sessionId: string,
  continuationToken: string | undefined,
  accessToken: string,
): Promise<EveResetStatus> {
  if (!continuationToken) return "unavailable";
  const session = createClient(accessToken, runId, correlationId).session({
    continuationToken,
    sessionId,
    streamIndex: 0,
  });
  return (await session.reset()).status;
}

export async function resetEveSession(
  sessionId: string,
  continuationToken: string | undefined,
  accessToken: string,
  correlationId: string,
): Promise<EveResetStatus> {
  if (!continuationToken) return "unavailable";
  const session = createClient(accessToken, `sandbox-delete-${sessionId}`, correlationId).session({
    continuationToken,
    sessionId,
    streamIndex: 0,
  });
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
    preserveCompletedSessions: true,
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
