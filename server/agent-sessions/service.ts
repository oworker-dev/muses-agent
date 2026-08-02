import { randomUUID } from "node:crypto";
import type { EveResetStatus } from "../agent-runs/eve-adapter.ts";
import { resetEveSession } from "../agent-runs/eve-adapter.ts";
import type { AgentSessionOwner, AgentSessionOwnershipStore } from "../data/session-ownership-store.ts";
import type { SandboxDeletionRecord, SandboxDeletionStore } from "../data/sandbox-deletion-store.ts";

export type AgentSessionDeletionRuntime = {
  readonly reset: typeof resetEveSession;
};

export const eveAgentSessionDeletionRuntime: AgentSessionDeletionRuntime = {
  reset: resetEveSession,
};

export type DeleteAgentSessionOutcome = {
  readonly deletion: SandboxDeletionRecord;
  readonly disposition: "authorized" | "already_authorized";
  readonly reset: Exclude<EveResetStatus, "unavailable">;
};

export class AgentSessionDeletionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AgentSessionDeletionError";
    this.status = status;
  }
}

export async function deleteAgentSession(options: {
  readonly accessToken: string;
  readonly continuationToken?: string;
  readonly deletionStore: SandboxDeletionStore;
  readonly identity: AgentSessionOwner;
  readonly ownershipStore: AgentSessionOwnershipStore;
  readonly runtime?: AgentSessionDeletionRuntime;
  readonly sessionId: string;
}): Promise<DeleteAgentSessionOutcome | undefined> {
  assertSessionId(options.sessionId);
  const ownership = await options.ownershipStore.verify(options.sessionId, options.identity);
  if (ownership === "missing" || ownership === "forbidden") return undefined;
  const existing = await options.deletionStore.findOwned(options.sessionId, options.identity);
  if (existing) {
    return {
      deletion: existing,
      disposition: "already_authorized",
      reset: "no_active_session",
    };
  }
  if (!options.continuationToken?.trim()) {
    throw new AgentSessionDeletionError(
      409,
      "agent_session_continuation_required",
      "This durable session cannot be retired without its continuation token.",
    );
  }
  if (options.continuationToken.length > 4_096 || /\s/.test(options.continuationToken)) {
    throw new AgentSessionDeletionError(
      400,
      "agent_session_continuation_invalid",
      "The durable session continuation token is invalid.",
    );
  }

  const runtime = options.runtime ?? eveAgentSessionDeletionRuntime;
  let reset: EveResetStatus;
  try {
    reset = await runtime.reset(
      options.sessionId,
      options.continuationToken,
      options.accessToken,
      `delete-${randomUUID()}`,
    );
  } catch {
    throw new AgentSessionDeletionError(
      502,
      "agent_session_retirement_failed",
      "The Agent runtime could not retire this session. Its sandbox was left intact.",
    );
  }
  if (reset === "unavailable") {
    throw new AgentSessionDeletionError(
      409,
      "agent_session_retirement_unavailable",
      "This durable session could not be retired, so its sandbox was left intact.",
    );
  }

  const authorization = await options.deletionStore.request({
    owner: options.identity,
    reason: "user-requested-session-deletion",
    requestedBy: `host:${options.identity.principalType}`,
    sessionId: options.sessionId,
  });
  if (!("record" in authorization)) {
    throw new AgentSessionDeletionError(
      409,
      "agent_session_ownership_changed",
      "The Agent session ownership changed while deletion was being authorized.",
    );
  }
  return {
    deletion: authorization.record,
    disposition: authorization.status === "created" ? "authorized" : "already_authorized",
    reset,
  };
}

function assertSessionId(sessionId: string): void {
  if (sessionId.trim().length === 0 || sessionId.length > 512 || /\s/.test(sessionId)) {
    throw new AgentSessionDeletionError(400, "agent_session_id_invalid", "The Agent session id is invalid.");
  }
}
