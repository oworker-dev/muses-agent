import { type HandleMessageStreamEvent } from "eve/client";
import type { AgentModelOption, AgentThread, AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
import { type AgentThreadStorage } from "./thread-storage.js";
export declare function AgentWorkspace({ agentName, client, commands, defaultPreferences, extensions, hostSlots, models, mentions, onEvent, onDeleteThread, onStorageError, productName, reasoningLevels, runtimeStatus, storageKey, threadStorage, }: {
    readonly agentName?: string;
    readonly client?: AgentWorkspaceClientConfig;
    readonly commands?: readonly import("./contracts.js").AgentPromptMenuItem[];
    readonly defaultPreferences: AgentThreadPreferences;
    readonly extensions?: readonly import("./contracts.js").AgentExtensionInfo[];
    readonly hostSlots?: {
        readonly sidebarFooter?: React.ReactNode;
        readonly threadHeaderEnd?: React.ReactNode;
    };
    readonly models: readonly AgentModelOption[];
    readonly mentions?: readonly import("./contracts.js").AgentPromptMenuItem[];
    readonly onEvent?: (event: HandleMessageStreamEvent) => void;
    readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
    readonly onStorageError?: (error: unknown) => void;
    readonly productName?: string;
    readonly reasoningLevels: readonly string[];
    readonly runtimeStatus?: import("./contracts.js").AgentRuntimeStatus;
    readonly storageKey?: string;
    readonly threadStorage?: AgentThreadStorage;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-workspace.d.ts.map