import type { HandleMessageStreamEvent } from "eve/client";

export type AgentUsageSummary = {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly contextInputTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
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

  for (const event of events) {
    if (event.type !== "step.completed" || !event.data.usage) continue;
    const usage = event.data.usage;
    cacheReadTokens += usage.cacheReadTokens ?? 0;
    cacheWriteTokens += usage.cacheWriteTokens ?? 0;
    contextInputTokens = usage.inputTokens ?? contextInputTokens;
    costUsd += usage.costUsd ?? 0;
    inputTokens += usage.inputTokens ?? 0;
    outputTokens += usage.outputTokens ?? 0;
    steps += 1;
  }

  return {
    cacheReadTokens,
    cacheWriteTokens,
    contextInputTokens,
    costUsd,
    inputTokens,
    outputTokens,
    steps,
  };
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}
