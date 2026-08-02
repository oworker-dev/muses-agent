import { type HandleMessageStreamEvent } from "eve/client";
import type { AgentModelOption, AgentThread, AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
import { type AgentThreadStorage } from "./thread-storage.js";
export declare function AgentWorkspace({ agentName, client, defaultPreferences, hostSlots, models, onEvent, onDeleteThread, onStorageError, productName, reasoningLevels, storageKey, threadStorage, }: {
    readonly agentName?: string;
    readonly client?: AgentWorkspaceClientConfig;
    readonly defaultPreferences: AgentThreadPreferences;
    readonly hostSlots?: {
        readonly sidebarFooter?: React.ReactNode;
        readonly threadHeaderEnd?: React.ReactNode;
    };
    readonly models: readonly AgentModelOption[];
    readonly onEvent?: (event: HandleMessageStreamEvent) => void;
    readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
    readonly onStorageError?: (error: unknown) => void;
    readonly productName?: string;
    readonly reasoningLevels: readonly string[];
    readonly storageKey?: string;
    readonly threadStorage?: AgentThreadStorage;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-workspace.d.ts.map