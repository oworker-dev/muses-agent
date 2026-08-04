import {
  Client,
  type ClientSession,
  type HandleMessageStreamEvent,
  type MessageResponse,
  type SendTurnInput,
} from "eve/client";
import {
  AGENT_SESSION_CONTRACT_VERSION,
  type AgentSessionCancellation,
  type AgentSessionCursor,
  type AgentSessionEvent,
  type AgentSessionInputRequest,
  type AgentSessionReset,
  type AgentSessionSendPayload,
  type AgentSessionTurnResult,
} from "@oworker/open-agent-contracts/agent-session";
import type { JsonValue } from "@oworker/open-agent-contracts/agent-run";
import type { AgentClientHeaders } from "./agent-run-client.js";

export const EVE_AGENT_SESSION_ADAPTER_VERSION = "0.1.0-alpha.8" as const;

export type AgentSessionClientOptions = {
  readonly baseUrl: string;
  readonly getAccessToken: () => string | Promise<string>;
  readonly headers?: AgentClientHeaders;
  readonly redirect?: RequestRedirect;
};

export type AgentSessionSendInput =
  | string
  | (AgentSessionSendPayload & {
      readonly headers?: Readonly<Record<string, string>>;
      readonly signal?: AbortSignal;
    });

export type AgentSessionStreamOptions = {
  readonly after?: number;
  readonly follow?: boolean;
  readonly signal?: AbortSignal;
};

export interface AgentSessionTurn<TOutput = unknown> extends AsyncIterable<AgentSessionEvent> {
  readonly continuationToken?: string;
  readonly sessionId: string;
  result(): Promise<AgentSessionTurnResult<TOutput>>;
}

export interface AgentSession {
  readonly cursor: AgentSessionCursor;
  send<TOutput = unknown>(input: AgentSessionSendInput): Promise<AgentSessionTurn<TOutput>>;
  stream(options?: AgentSessionStreamOptions): AsyncIterable<AgentSessionEvent>;
  cancel(options?: { readonly turnId?: string }): Promise<AgentSessionCancellation>;
  reset(): Promise<AgentSessionReset>;
}

export interface AgentSessionClient {
  session(cursor?: AgentSessionCursor): AgentSession;
}

/**
 * Default interactive-session adapter for Eve 0.27.x.
 *
 * The returned surface contains no Eve classes or event types. Hosts persist
 * the AgentSession cursor and can replace this adapter without changing UI
 * ownership or thread storage.
 */
export function createEveAgentSessionClient(options: AgentSessionClientOptions): AgentSessionClient {
  const client = new Client({
    auth: { bearer: options.getAccessToken },
    headers: options.headers,
    host: normalizeBaseUrl(options.baseUrl),
    preserveCompletedSessions: true,
    redirect: options.redirect ?? "error",
  });
  return {
    session(cursor) {
      return new EveAgentSession(client.session(toEveCursor(cursor)));
    },
  };
}

class EveAgentSession implements AgentSession {
  constructor(private readonly sessionHandle: ClientSession) {}

  get cursor(): AgentSessionCursor {
    return fromEveCursor(this.sessionHandle.state);
  }

  async send<TOutput = unknown>(input: AgentSessionSendInput): Promise<AgentSessionTurn<TOutput>> {
    const startCursor = this.cursor.eventCursor;
    const response = await this.sessionHandle.send<TOutput>(toEveSendInput<TOutput>(input));
    return new EveAgentSessionTurn<TOutput>(response, startCursor);
  }

  async *stream(options?: AgentSessionStreamOptions): AsyncIterable<AgentSessionEvent> {
    let cursor = options?.after ?? this.cursor.eventCursor;
    if (!Number.isSafeInteger(cursor) || cursor < 0) {
      throw new RangeError("Agent session event cursor must be a non-negative safe integer.");
    }
    for await (const event of this.sessionHandle.stream({
      follow: options?.follow,
      signal: options?.signal,
      startIndex: cursor,
    })) {
      cursor += 1;
      yield projectSessionEvent(event, cursor);
    }
  }

  async cancel(options?: { readonly turnId?: string }): Promise<AgentSessionCancellation> {
    return this.sessionHandle.cancel(options);
  }

  async reset(): Promise<AgentSessionReset> {
    return this.sessionHandle.reset();
  }
}

class EveAgentSessionTurn<TOutput> implements AgentSessionTurn<TOutput> {
  readonly continuationToken?: string;
  readonly sessionId: string;
  private consumed = false;

  constructor(
    private readonly response: MessageResponse<TOutput>,
    private readonly startCursor: number,
  ) {
    this.continuationToken = response.continuationToken;
    this.sessionId = response.sessionId;
  }

  async result(): Promise<AgentSessionTurnResult<TOutput>> {
    this.assertUnconsumed();
    this.consumed = true;
    const result = await this.response.result();
    return {
      data: result.data,
      events: result.events.map((event, index) => projectSessionEvent(event, this.startCursor + index + 1)),
      inputRequests: result.inputRequests as readonly AgentSessionInputRequest[],
      message: result.message,
      sessionId: result.sessionId,
      status: result.status,
    };
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AgentSessionEvent> {
    this.assertUnconsumed();
    this.consumed = true;
    let cursor = this.startCursor;
    for await (const event of this.response) {
      cursor += 1;
      yield projectSessionEvent(event, cursor);
    }
  }

  private assertUnconsumed() {
    if (this.consumed) throw new Error("AgentSessionTurn has already been consumed.");
  }
}

function toEveCursor(cursor: AgentSessionCursor | undefined) {
  if (!cursor) return undefined;
  if (!Number.isSafeInteger(cursor.eventCursor) || cursor.eventCursor < 0) {
    throw new RangeError("Agent session event cursor must be a non-negative safe integer.");
  }
  return {
    ...(cursor.continuationToken ? { continuationToken: cursor.continuationToken } : {}),
    ...(cursor.sessionId ? { sessionId: cursor.sessionId } : {}),
    streamIndex: cursor.eventCursor,
  };
}

function fromEveCursor(cursor: ClientSession["state"]): AgentSessionCursor {
  return {
    ...(cursor.continuationToken ? { continuationToken: cursor.continuationToken } : {}),
    ...(cursor.sessionId ? { sessionId: cursor.sessionId } : {}),
    eventCursor: cursor.streamIndex,
  };
}

function toEveSendInput<TOutput>(input: AgentSessionSendInput): SendTurnInput<TOutput> {
  if (typeof input === "string") return input;
  return input as SendTurnInput<TOutput>;
}

function projectSessionEvent(event: HandleMessageStreamEvent, cursor: number): AgentSessionEvent {
  const candidate = event as unknown as { readonly data?: JsonValue; readonly meta?: JsonValue; readonly type: string };
  return {
    contractVersion: AGENT_SESSION_CONTRACT_VERSION,
    cursor,
    ...(candidate.data === undefined ? {} : { data: candidate.data }),
    ...(candidate.meta === undefined ? {} : { meta: candidate.meta }),
    type: candidate.type,
  };
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized) throw new Error("Agent service base URL is required.");
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Agent service base URL must be an absolute HTTP(S) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Agent service base URL must use HTTP or HTTPS.");
  }
  return normalized;
}
