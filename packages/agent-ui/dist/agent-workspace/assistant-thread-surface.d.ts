import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import type { ReactNode } from "react";
import { type AgentInputResponse } from "./agent-message.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThreadPreferences } from "./contracts.js";
import type { AgentLocale, AgentMessages } from "./i18n.js";
import type { AgentUsageSummary } from "./usage.js";
export declare function AssistantThreadSurface({ commands, events, eveMessages, fallbackStartedAt, isBusy, locale, mentions, messages, models, onInputResponses, onOpenSubagent, onPreferencesChange, pendingTurnText, preferences, quietActivity, reasoningLevels, usage, }: {
    readonly commands: readonly AgentPromptMenuItem[];
    readonly events: readonly HandleMessageStreamEvent[];
    readonly eveMessages: readonly EveMessage[];
    readonly fallbackStartedAt?: number;
    readonly isBusy: boolean;
    readonly locale: AgentLocale;
    readonly mentions: readonly AgentPromptMenuItem[];
    readonly messages: AgentMessages;
    readonly models: readonly AgentModelOption[];
    readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
    readonly onOpenSubagent?: (sessionId: string) => void;
    readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
    readonly pendingTurnText?: string;
    readonly preferences: AgentThreadPreferences;
    readonly quietActivity: boolean;
    readonly reasoningLevels: readonly string[];
    readonly usage: AgentUsageSummary;
}): import("react/jsx-runtime").JSX.Element;
export declare function AssistantText({ children }: {
    readonly children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=assistant-thread-surface.d.ts.map