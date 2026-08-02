import { type PromptInputMessage } from "../ai-elements/prompt-input.js";
import type { AgentMessages } from "./i18n.js";
import type { AgentModelOption, AgentThreadPreferences } from "./contracts.js";
import type { AgentUsageSummary } from "./usage.js";
export declare function AgentComposer({ messages, models, onPreferencesChange, onSubmit, onStop, preferences, reasoningLevels, status, usage, }: {
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
//# sourceMappingURL=agent-composer.d.ts.map