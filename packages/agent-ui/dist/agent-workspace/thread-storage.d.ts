import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentThread, AgentThreadPreferences } from "./contracts.js";
export declare const AGENT_THREAD_STORAGE_VERSION = 1;
export type AgentThreadCollection = {
    readonly activeThreadId?: string;
    readonly threads: readonly AgentThread[];
    readonly version: number;
};
export type AgentThreadStorage = {
    load(storageKey: string): AgentThreadCollection | Promise<AgentThreadCollection>;
    save(storageKey: string, collection: AgentThreadCollection): void | Promise<void>;
};
export declare const browserThreadStorage: AgentThreadStorage;
export declare function createAgentThread(now?: number, title?: string, preferences?: AgentThreadPreferences): AgentThread;
export declare function loadThreadCollection(storageKey: string): AgentThreadCollection;
export declare function parseThreadCollection(value: unknown): AgentThreadCollection;
export declare function saveThreadCollection(storageKey: string, threads: readonly AgentThread[], activeThreadId?: string): boolean;
export declare function titleFromPrompt(prompt: string): string;
export declare function appendThreadEvent(events: readonly HandleMessageStreamEvent[], event: HandleMessageStreamEvent): readonly HandleMessageStreamEvent[];
export declare function compactThreadEvents(events: readonly HandleMessageStreamEvent[]): readonly HandleMessageStreamEvent[];
//# sourceMappingURL=thread-storage.d.ts.map