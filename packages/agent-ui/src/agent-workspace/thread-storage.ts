import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import type { AgentThread, AgentThreadPreferences, AgentThreadStatus } from "./contracts.js";

export const AGENT_THREAD_STORAGE_VERSION = 1;
const EMPTY_SESSION: SessionState = { streamIndex: 0 };
const FALLBACK_PREFERENCES: AgentThreadPreferences = {
  modelId: "default",
  reasoning: "medium",
};

export type AgentThreadCollection = {
  readonly activeThreadId?: string;
  readonly threads: readonly AgentThread[];
  readonly version: number;
};

export type AgentThreadStorage = {
  load(storageKey: string): AgentThreadCollection | Promise<AgentThreadCollection>;
  save(storageKey: string, collection: AgentThreadCollection): void | Promise<void>;
};

export const browserThreadStorage: AgentThreadStorage = {
  load: loadThreadCollection,
  save(storageKey, collection) {
    saveThreadCollection(storageKey, collection.threads, collection.activeThreadId);
  },
};

export function createAgentThread(
  now = Date.now(),
  title = "New task",
  preferences: AgentThreadPreferences = FALLBACK_PREFERENCES,
): AgentThread {
  return {
    createdAt: now,
    events: [],
    id: createId(),
    preferences: { ...preferences },
    session: EMPTY_SESSION,
    status: "ready",
    title,
    updatedAt: now,
  };
}

export function loadThreadCollection(storageKey: string): AgentThreadCollection {
  if (typeof window === "undefined") {
    return { threads: [], version: AGENT_THREAD_STORAGE_VERSION };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { threads: [], version: AGENT_THREAD_STORAGE_VERSION };
    return parseThreadCollection(JSON.parse(raw));
  } catch {
    return { threads: [], version: AGENT_THREAD_STORAGE_VERSION };
  }
}

export function parseThreadCollection(value: unknown): AgentThreadCollection {
  if (
    !isRecord(value) ||
    value.version !== AGENT_THREAD_STORAGE_VERSION ||
    !Array.isArray(value.threads)
  ) {
    return { threads: [], version: AGENT_THREAD_STORAGE_VERSION };
  }

  const threads = value.threads
    .map(parseThread)
    .filter((thread): thread is AgentThread => !!thread);
  const activeThreadId =
    typeof value.activeThreadId === "string" &&
    threads.some((thread) => thread.id === value.activeThreadId)
      ? value.activeThreadId
      : undefined;

  return { activeThreadId, threads, version: AGENT_THREAD_STORAGE_VERSION };
}

export function saveThreadCollection(
  storageKey: string,
  threads: readonly AgentThread[],
  activeThreadId?: string,
): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeThreadId,
        threads,
        version: AGENT_THREAD_STORAGE_VERSION,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function titleFromPrompt(prompt: string): string {
  const compact = prompt.replaceAll(/\s+/g, " ").trim();
  if (compact.length === 0) return "New task";
  return compact.length > 42 ? `${compact.slice(0, 41)}...` : compact;
}

function parseThread(value: unknown): AgentThread | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.id !== "string" || typeof value.title !== "string") return undefined;

  const createdAt = numberOrNow(value.createdAt);
  const updatedAt = numberOrNow(value.updatedAt);
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  const session = isRecord(value.session) ? value.session : {};
  const status = isThreadStatus(value.status) ? value.status : "ready";

  return {
    createdAt,
    events: Array.isArray(value.events)
      ? (value.events as readonly HandleMessageStreamEvent[])
      : [],
    id: value.id,
    preferences: {
      modelId: nonEmptyString(preferences.modelId) ?? FALLBACK_PREFERENCES.modelId,
      reasoning: nonEmptyString(preferences.reasoning) ?? FALLBACK_PREFERENCES.reasoning,
    },
    session: {
      continuationToken:
        typeof session.continuationToken === "string" ? session.continuationToken : undefined,
      sessionId: typeof session.sessionId === "string" ? session.sessionId : undefined,
      streamIndex:
        typeof session.streamIndex === "number" && session.streamIndex >= 0
          ? session.streamIndex
          : 0,
    },
    status,
    title: value.title,
    updatedAt,
  };
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `thread-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThreadStatus(value: unknown): value is AgentThreadStatus {
  return value === "error" || value === "ready" || value === "streaming" || value === "submitted";
}

function numberOrNow(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Date.now();
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
