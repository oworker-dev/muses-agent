import type { HandleMessageStreamEvent } from "eve/client";
import {
  AGENT_RUN_CONTRACT_VERSION,
  type AgentEvent,
  type AgentEventType,
  type AgentRunResult,
  type AgentRunStatus,
  type AgentRunUsage,
  type JsonValue,
} from "../../contracts/agent-run.ts";
import type { AgentRunProjection } from "../data/agent-run-store.ts";

export function projectAgentRun(
  events: readonly HandleMessageStreamEvent[],
): AgentRunProjection {
  let status: AgentRunStatus = "running";
  let result: AgentRunResult | undefined;
  let failure: AgentRunProjection["failure"];
  let cancelled = false;
  let waitingInput = false;
  let waitingAuthorization = false;
  const usage = emptyUsage();

  for (const event of events) {
    switch (event.type) {
      case "input.requested":
        waitingInput = true;
        status = "waiting-input";
        break;
      case "authorization.required":
        waitingAuthorization = true;
        status = "waiting-authorization";
        break;
      case "authorization.completed":
        waitingAuthorization = false;
        status = "running";
        break;
      case "result.completed":
        result = { kind: "json", value: toJsonValue(event.data.result) };
        break;
      case "message.completed":
        if (event.data.message && event.data.finishReason !== "tool-calls") {
          result ??= { kind: "text", value: event.data.message };
        }
        break;
      case "step.completed":
        if (event.data.usage) {
          usage.cacheReadTokens += event.data.usage.cacheReadTokens ?? 0;
          usage.cacheWriteTokens += event.data.usage.cacheWriteTokens ?? 0;
          usage.costUsd += event.data.usage.costUsd ?? 0;
          usage.inputTokens += event.data.usage.inputTokens ?? 0;
          usage.outputTokens += event.data.usage.outputTokens ?? 0;
        }
        usage.steps += 1;
        break;
      case "turn.cancelled":
        cancelled = true;
        status = "cancelled";
        break;
      case "turn.failed":
      case "session.failed":
        status = "failed";
        failure = {
          code: event.data.code,
          message: event.data.message,
          retryable: false,
        };
        break;
      case "session.completed":
        if (!cancelled && !failure) status = "completed";
        break;
      case "session.waiting":
        if (cancelled) status = "cancelled";
        else if (failure) status = "failed";
        else if (waitingInput) status = "waiting-input";
        else if (waitingAuthorization) status = "waiting-authorization";
        else status = "completed";
        break;
    }
  }

  return {
    eventCount: events.length,
    ...(failure ? { failure } : {}),
    ...(result ? { result } : {}),
    status,
    usage,
  };
}

export function projectAgentEvents(
  runId: string,
  events: readonly HandleMessageStreamEvent[],
): readonly AgentEvent[] {
  return events.map((event, index) => ({
    contractVersion: AGENT_RUN_CONTRACT_VERSION,
    ...(event.meta?.at ? { createdAt: event.meta.at } : {}),
    data: toJsonObject("data" in event ? event.data : {}),
    runId,
    sequence: index + 1,
    type: eventType(event.type),
  }));
}

function eventType(type: HandleMessageStreamEvent["type"]): AgentEventType {
  switch (type) {
    case "session.started": return "run.started";
    case "session.completed":
    case "turn.completed": return "run.completed";
    case "session.failed":
    case "turn.failed": return "run.failed";
    case "turn.cancelled": return "run.cancelled";
    case "message.received": return "message.received";
    case "message.appended": return "message.delta";
    case "message.completed": return "message.completed";
    case "reasoning.appended": return "reasoning.delta";
    case "reasoning.completed": return "reasoning.completed";
    case "actions.requested": return "tool.requested";
    case "action.result": return "tool.completed";
    case "input.requested": return "input.requested";
    case "authorization.required": return "authorization.required";
    case "authorization.completed": return "authorization.completed";
    case "result.completed": return "result.completed";
    case "step.completed": return "usage.recorded";
    default: return "runtime.event";
  }
}

function emptyUsage(): MutableUsage {
  return {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    steps: 0,
  };
}

type MutableUsage = { -readonly [Key in keyof AgentRunUsage]: AgentRunUsage[Key] };

function toJsonObject(value: unknown): Readonly<Record<string, JsonValue>> {
  const normalized = toJsonValue(value);
  return isJsonObject(normalized)
    ? normalized
    : { value: normalized };
}

function isJsonObject(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value ?? null);
  return JSON.parse(serialized) as JsonValue;
}
