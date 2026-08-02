import type { ClientAuth, ClientRedirectPolicy, HandleMessageStreamEvent, HeadersValue, PrepareSend, SessionState } from "eve/client";
import type { ReactNode } from "react";
import type { AgentThreadStorage } from "./thread-storage.js";
export type AgentThreadStatus = "error" | "ready" | "streaming" | "submitted";
export type AgentThreadPreferences = {
    readonly modelId: string;
    readonly reasoning: string;
};
export type AgentModelOption = {
    readonly contextWindowTokens: number;
    readonly id: string;
    readonly label: string;
};
export type AgentThread = {
    readonly createdAt: number;
    readonly events: readonly HandleMessageStreamEvent[];
    readonly id: string;
    readonly preferences: AgentThreadPreferences;
    readonly session: SessionState;
    readonly status: AgentThreadStatus;
    readonly title: string;
    readonly updatedAt: number;
};
export type AgentThreadPatch = Partial<Omit<AgentThread, "id">>;
export type AgentWorkspaceHostSlots = {
    readonly sidebarFooter?: ReactNode;
    readonly threadHeaderEnd?: ReactNode;
};
export type AgentWorkspaceClientConfig = {
    readonly auth?: ClientAuth;
    readonly headers?: HeadersValue;
    readonly host?: string;
    readonly prepareSend?: PrepareSend;
    readonly redirect?: ClientRedirectPolicy;
};
export type AgentWorkspaceConfig = {
    readonly agentName: string;
    readonly client?: AgentWorkspaceClientConfig;
    readonly defaultPreferences: AgentThreadPreferences;
    readonly hostSlots?: AgentWorkspaceHostSlots;
    readonly models: readonly AgentModelOption[];
    readonly onEvent?: (event: HandleMessageStreamEvent) => void;
    readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
    readonly onStorageError?: (error: unknown) => void;
    readonly productName: string;
    readonly reasoningLevels: readonly string[];
    readonly storageKey?: string;
    readonly threadStorage?: AgentThreadStorage;
};
//# sourceMappingURL=contracts.d.ts.map