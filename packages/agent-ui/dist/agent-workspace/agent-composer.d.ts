import type { LanguageModelUsage } from "ai";
import type { AgentMessages } from "./i18n.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThreadPreferences } from "./contracts.js";
import type { AgentUsageSummary } from "./usage.js";
export type PromptInputMessage = {
    readonly files: readonly {
        readonly filename?: string;
        readonly mediaType: string;
        readonly url: string;
    }[];
    readonly text: string;
};
export declare function AgentComposer({ commands, disabled, inputDisabled, mentions, messages, models, onPreferencesChange, onSubmit, onStop, preferences, reasoningLevels, status, usage, }: {
    readonly commands?: readonly AgentPromptMenuItem[];
    readonly disabled?: boolean;
    readonly inputDisabled?: boolean;
    readonly mentions?: readonly AgentPromptMenuItem[];
    readonly messages: AgentMessages;
    readonly models: readonly AgentModelOption[];
    readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
    readonly onSubmit: (message: PromptInputMessage) => Promise<void>;
    readonly onStop: () => void;
    readonly preferences: AgentThreadPreferences;
    readonly reasoningLevels: readonly string[];
    readonly status: "error" | "ready" | "streaming" | "submitted";
    readonly usage: AgentUsageSummary;
}): import("react/jsx-runtime").JSX.Element;
export declare function formatUsage(usage: LanguageModelUsage | undefined): string;
//# sourceMappingURL=agent-composer.d.ts.map