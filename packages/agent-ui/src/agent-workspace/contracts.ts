import type {
  ClientAuth,
  ClientRedirectPolicy,
  HandleMessageStreamEvent,
  HeadersValue,
  PrepareSend,
  SessionState,
} from "eve/client";
import type { ReactNode } from "react";
import type { AgentThreadStorage } from "./thread-storage.js";

export type AgentThreadStatus = "error" | "ready" | "streaming" | "submitted";

export type AgentExecutionMode = "automation" | "cautious" | "standard";

export type AgentThreadPreferences = {
  readonly executionMode?: AgentExecutionMode;
  readonly modelId: string;
  readonly reasoning: string;
};

export type AgentModelOption = {
  readonly contextWindowTokens: number;
  readonly id: string;
  readonly label: string;
};

export type AgentPromptMenuItem = {
  readonly description?: string;
  readonly id: string;
  readonly keywords?: readonly string[];
  readonly label: string;
  readonly value: string;
};

export type AgentExtensionInfo = {
  readonly description?: string;
  readonly id: string;
  readonly kind: "mcp" | "skill";
  readonly label: string;
  readonly status: "available" | "disabled" | "unconfigured";
  readonly version?: string;
};

export type AgentRuntimeStatus = {
  readonly provider: "mock" | "ready" | "unconfigured";
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
  readonly commands?: readonly AgentPromptMenuItem[];
  readonly defaultPreferences: AgentThreadPreferences;
  readonly extensions?: readonly AgentExtensionInfo[];
  readonly hostSlots?: AgentWorkspaceHostSlots;
  readonly models: readonly AgentModelOption[];
  readonly mentions?: readonly AgentPromptMenuItem[];
  readonly onEvent?: (event: HandleMessageStreamEvent) => void;
  readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
  readonly onStorageError?: (error: unknown) => void;
  readonly productName: string;
  readonly reasoningLevels: readonly string[];
  readonly runtimeStatus?: AgentRuntimeStatus;
  readonly storageKey?: string;
  readonly threadStorage?: AgentThreadStorage;
};
