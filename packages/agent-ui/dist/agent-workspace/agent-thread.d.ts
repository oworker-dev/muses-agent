import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentModelOption, AgentThread, AgentThreadPatch, AgentWorkspaceClientConfig } from "./contracts.js";
import { type AgentLocale } from "./i18n.js";
export declare function AgentThreadView({ client, locale, models, onChange, onEvent, reasoningLevels, thread, }: {
    readonly client?: AgentWorkspaceClientConfig;
    readonly locale: AgentLocale;
    readonly models: readonly AgentModelOption[];
    readonly onChange: (patch: AgentThreadPatch) => void;
    readonly onEvent?: (event: HandleMessageStreamEvent) => void;
    readonly reasoningLevels: readonly string[];
    readonly thread: AgentThread;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-thread.d.ts.map