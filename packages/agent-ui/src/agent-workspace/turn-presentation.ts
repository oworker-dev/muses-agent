import type { HandleMessageStreamEvent, InputRequest } from "eve/client";
import type { EveDynamicToolPart, EveMessage, EveMessagePart } from "eve/react";

export type AgentTurnStatus = "cancelled" | "completed" | "failed" | "running" | "waiting";

export type SubagentCallPresentation = {
  readonly endedAt?: number;
  readonly startedAt?: number;
  readonly status: "completed" | "failed" | "running" | "starting";
};

export type AgentTurnPresentation = {
  readonly endedAt?: number;
  readonly finalPart?: Extract<EveMessagePart, { type: "text" }>;
  readonly proxiedInputParts: readonly EveDynamicToolPart[];
  readonly processParts: readonly EveMessagePart[];
  readonly startedAt?: number;
  readonly status: AgentTurnStatus;
};

export function presentAgentTurn(
  message: EveMessage,
  events: readonly HandleMessageStreamEvent[],
): AgentTurnPresentation | undefined {
  if (message.role !== "assistant" || !message.metadata?.turnId) return undefined;

  const turnId = message.metadata.turnId;
  const turnEvents = eventsForRootTurn(events, turnId);
  const pendingRequests = pendingRequestsForRootTurn(events, turnId);
  const firstAction = turnEvents.find((event) => event.type === "actions.requested");
  const hasTools = firstAction !== undefined || pendingRequests.length > 0 || message.parts.some((part) => part.type === "dynamic-tool");
  if (!hasTools) return undefined;

  const terminal = [...turnEvents].reverse().find((event) =>
    event.type === "turn.completed" || event.type === "turn.failed" || event.type === "turn.cancelled",
  );
  const status = pendingRequests.length > 0
    ? "waiting"
    : terminal?.type === "turn.completed"
    ? "completed"
    : terminal?.type === "turn.failed"
      ? "failed"
      : terminal?.type === "turn.cancelled"
        ? "cancelled"
        : "running";
  const finalStepIndex = finalDeliveryStepIndex(turnEvents, message, status);
  let finalPart: Extract<EveMessagePart, { type: "text" }> | undefined;
  const processParts: EveMessagePart[] = [];

  for (const part of message.parts) {
    if (part.type === "step-start") continue;
    if (part.type === "text" && part.stepIndex === finalStepIndex) {
      finalPart = part;
      continue;
    }
    processParts.push(part);
  }

  return {
    endedAt: eventTimestamp(terminal),
    finalPart,
    proxiedInputParts: pendingRequests
      .filter((request) => !message.parts.some((part) =>
        part.type === "dynamic-tool" && part.approval?.id === request.requestId,
      ))
      .map(toProxiedInputPart),
    processParts,
    startedAt: eventTimestamp(firstAction),
    status,
  };
}

/**
 * Eve proxies descendant HITL requests onto the root stream. They retain the
 * child turn id, so the default reducer creates an otherwise orphaned message.
 * The workspace renders those requests inside the owning root task instead.
 */
export function isProxiedInputOnlyMessage(
  message: EveMessage,
  events: readonly HandleMessageStreamEvent[],
): boolean {
  if (message.role !== "assistant" || !message.metadata?.turnId) return false;
  const turnId = message.metadata.turnId;
  if (events.some((event) => event.type === "turn.started" && event.data.turnId === turnId)) {
    return false;
  }
  const requests = events.flatMap((event) =>
    event.type === "input.requested" && event.data.turnId === turnId
      ? event.data.requests
      : [],
  );
  if (requests.length === 0) return false;
  const requestIds = new Set(requests.map((request) => request.requestId));
  return message.parts.every((part) =>
    part.type === "step-start" ||
    (part.type === "dynamic-tool" && part.approval !== undefined && requestIds.has(part.approval.id)),
  );
}

export function unresolvedInputRequests(
  events: readonly HandleMessageStreamEvent[],
): readonly InputRequest[] {
  let pending = new Map<string, InputRequest>();
  let hasRequestedInput = false;
  for (const event of events) {
    if (event.type === "input.requested") {
      hasRequestedInput = true;
      for (const request of event.data.requests) pending.set(request.requestId, request);
      continue;
    }
    // Eve resumes a parked request by starting the next root turn. Descendant
    // turn starts are not proxied as top-level events.
    if (event.type === "turn.started" && hasRequestedInput) {
      pending = new Map();
      hasRequestedInput = false;
      continue;
    }
    if (event.type === "session.completed" || event.type === "session.failed") {
      pending = new Map();
      hasRequestedInput = false;
    }
  }
  return [...pending.values()];
}

export function hasUnresolvedInputRequests(
  events: readonly HandleMessageStreamEvent[],
): boolean {
  return unresolvedInputRequests(events).length > 0;
}

export function presentSubagentCall(
  events: readonly HandleMessageStreamEvent[],
  callId: string,
): SubagentCallPresentation {
  const started = events.find((event) =>
    event.type === "subagent.called" && event.data.callId === callId,
  );
  const completed = [...events].reverse().find((event) =>
    event.type === "subagent.completed" && event.data.callId === callId,
  );
  const result = [...events].reverse().find((event) =>
    event.type === "action.result" &&
    event.data.result.kind === "subagent-result" &&
    event.data.result.callId === callId,
  );

  if (result?.type === "action.result" && result.data.status !== "completed") {
    return {
      endedAt: eventTimestamp(result),
      startedAt: eventTimestamp(started),
      status: "failed",
    };
  }
  if (completed || result) {
    return {
      endedAt: eventTimestamp(result ?? completed),
      startedAt: eventTimestamp(started),
      status: "completed",
    };
  }
  if (!started) return { status: "starting" };
  return {
    startedAt: eventTimestamp(started),
    status: "running",
  };
}

function eventsForRootTurn(
  events: readonly HandleMessageStreamEvent[],
  turnId: string,
): readonly HandleMessageStreamEvent[] {
  const start = events.findIndex((event) =>
    event.type === "turn.started" && event.data.turnId === turnId,
  );
  if (start < 0) return events.filter((event) => eventTurnId(event) === turnId);
  const next = events.findIndex((event, index) => index > start && event.type === "turn.started");
  return events.slice(start, next < 0 ? undefined : next);
}

function pendingRequestsForRootTurn(
  events: readonly HandleMessageStreamEvent[],
  turnId: string,
): readonly InputRequest[] {
  const pendingIds = new Set(unresolvedInputRequests(events).map((request) => request.requestId));
  if (pendingIds.size === 0) return [];
  return eventsForRootTurn(events, turnId)
    .flatMap((event) => event.type === "input.requested" ? event.data.requests : [])
    .filter((request) => pendingIds.has(request.requestId));
}

function toProxiedInputPart(request: InputRequest): EveDynamicToolPart {
  return {
    approval: { id: request.requestId },
    input: request.action.input,
    state: "approval-requested",
    toolCallId: request.action.callId,
    toolMetadata: {
      eve: {
        inputRequest: {
          allowFreeform: request.allowFreeform,
          display: request.display,
          options: request.options,
          prompt: request.prompt,
          requestId: request.requestId,
        },
        kind: "tool-call",
        name: request.action.toolName,
      },
    },
    toolName: request.action.toolName,
    type: "dynamic-tool",
  };
}

function finalDeliveryStepIndex(
  events: readonly HandleMessageStreamEvent[],
  message: EveMessage,
  status: AgentTurnStatus,
): number | undefined {
  const completedDelivery = [...events].reverse().find((event) =>
    event.type === "message.completed" &&
    event.data.message !== null &&
    event.data.finishReason !== "tool-calls",
  );
  if (completedDelivery?.type === "message.completed") return completedDelivery.data.stepIndex;
  if (status !== "running") return undefined;

  const latestActionStep = events.reduce(
    (latest, event) => event.type === "actions.requested" ? Math.max(latest, event.data.stepIndex) : latest,
    -1,
  );
  const latestText = [...message.parts].reverse().find((part) => part.type === "text");
  return latestText?.type === "text" && (latestText.stepIndex ?? 0) > latestActionStep
    ? latestText.stepIndex
    : undefined;
}

function eventTurnId(event: HandleMessageStreamEvent): string | undefined {
  if (!("data" in event) || !event.data || typeof event.data !== "object") return undefined;
  return "turnId" in event.data && typeof event.data.turnId === "string"
    ? event.data.turnId
    : undefined;
}

function eventTimestamp(event: HandleMessageStreamEvent | undefined): number | undefined {
  const timestamp = event?.meta?.at;
  if (!timestamp) return undefined;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : undefined;
}
