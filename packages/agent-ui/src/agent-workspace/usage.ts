import type { HandleMessageStreamEvent } from "eve/client";

export type AgentUsageSummary = {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly contextInputTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
  readonly isEstimated: boolean;
  readonly outputTokens: number;
  readonly steps: number;
};

export function summarizeUsage(events: readonly HandleMessageStreamEvent[]): AgentUsageSummary {
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let contextInputTokens = 0;
  let costUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let steps = 0;
  let lastCompletedStepIndex = -1;

  for (const [eventIndex, event] of events.entries()) {
    if (event.type !== "step.completed" || !event.data.usage) continue;
    const usage = event.data.usage;
    cacheReadTokens += usage.cacheReadTokens ?? 0;
    cacheWriteTokens += usage.cacheWriteTokens ?? 0;
    contextInputTokens = (usage.inputTokens ?? contextInputTokens) + (usage.outputTokens ?? 0);
    costUsd += usage.costUsd ?? 0;
    inputTokens += usage.inputTokens ?? 0;
    outputTokens += usage.outputTokens ?? 0;
    steps += 1;
    lastCompletedStepIndex = eventIndex;
  }

  const pending = estimatePendingTokens(events.slice(lastCompletedStepIndex + 1));
  contextInputTokens += pending.context;
  outputTokens += pending.output;

  return {
    cacheReadTokens,
    cacheWriteTokens,
    contextInputTokens,
    costUsd,
    inputTokens,
    isEstimated: pending.context > 0,
    outputTokens,
    steps,
  };
}

function estimatePendingTokens(events: readonly HandleMessageStreamEvent[]): { readonly context: number; readonly output: number } {
  const cumulativeText = new Map<string, string>();
  let contextCharacters = 0;

  for (const event of events) {
    if (event.type === "message.appended") {
      cumulativeText.set(`message:${event.data.turnId}:${event.data.stepIndex}`, event.data.messageSoFar);
    } else if (event.type === "reasoning.appended") {
      cumulativeText.set(`reasoning:${event.data.turnId}:${event.data.stepIndex}`, event.data.reasoningSoFar);
    } else if (event.type === "message.completed") {
      cumulativeText.set(`message:${event.data.turnId}:${event.data.stepIndex}`, event.data.message ?? "");
    } else if (event.type === "reasoning.completed") {
      cumulativeText.set(`reasoning:${event.data.turnId}:${event.data.stepIndex}`, event.data.reasoning);
    } else if (event.type === "message.received") {
      contextCharacters += event.data.message.length;
    } else if (event.type === "action.result") {
      contextCharacters += safeSerializedLength(event.data.result.output);
    }
  }

  let outputCharacters = 0;
  for (const value of cumulativeText.values()) outputCharacters += value.length;
  return {
    context: Math.ceil((contextCharacters + outputCharacters) / 4),
    output: Math.ceil(outputCharacters / 4),
  };
}

function safeSerializedLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}
