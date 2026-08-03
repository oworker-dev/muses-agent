import type { AgentPromptMenuItem } from "./contracts.js";
export type PromptTrigger = {
    readonly end: number;
    readonly kind: "command" | "mention";
    readonly query: string;
    readonly start: number;
};
export declare function findPromptTrigger(input: string): PromptTrigger | undefined;
export declare function filterPromptMenuItems(items: readonly AgentPromptMenuItem[], query: string): readonly AgentPromptMenuItem[];
export declare function replacePromptTrigger(input: string, trigger: PromptTrigger, value: string): string;
//# sourceMappingURL=prompt-menu.d.ts.map