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
export declare function summarizeUsage(events: readonly HandleMessageStreamEvent[]): AgentUsageSummary;
export declare function formatTokenCount(value: number): string;
//# sourceMappingURL=usage.d.ts.map