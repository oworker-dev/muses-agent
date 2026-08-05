import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentModelOption, AgentPromptMenuItem, AgentThread, AgentThreadPatch, AgentWorkspaceClientConfig } from "./contracts.js";
import { type AgentLocale } from "./i18n.js";
export declare function AgentThreadView({ client, commands, locale, mentions, models, onChange, onEvent, onRecoveryNeeded, providerReady, reasoningLevels, thread, }: {
    readonly client?: AgentWorkspaceClientConfig;
    readonly commands: readonly AgentPromptMenuItem[];
    readonly locale: AgentLocale;
    readonly mentions: readonly AgentPromptMenuItem[];
    readonly models: readonly AgentModelOption[];
    readonly onChange: (patch: AgentThreadPatch) => void;
    readonly onEvent?: (event: HandleMessageStreamEvent) => void;
    readonly onRecoveryNeeded: () => void;
    readonly providerReady: boolean;
    readonly reasoningLevels: readonly string[];
    readonly thread: AgentThread;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-thread.d.ts.map