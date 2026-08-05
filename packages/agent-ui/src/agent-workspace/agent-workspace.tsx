"use client";

import { defaultMessageReducer, type HandleMessageStreamEvent } from "eve/client";
import { AlertCircleIcon, LanguagesIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftIcon, RotateCcwIcon, ServerOffIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { Conversation, ConversationContent } from "../ai-elements/conversation.js";
import { createAgentSession } from "./agent-client.js";
import { AgentMessage } from "./agent-message.js";
import { AgentSettingsDialog } from "./agent-settings-dialog.js";
import { AgentSidebar } from "./agent-sidebar.js";
import { AgentThreadView } from "./agent-thread.js";
import type { AgentModelOption, AgentThread, AgentThreadPatch, AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
import { messagesFor, resolveBrowserLocale, type AgentLocale } from "./i18n.js";
import {
  AGENT_THREAD_STORAGE_VERSION,
  browserThreadStorage,
  createAgentThread,
  type AgentThreadStorage,
} from "./thread-storage.js";

const DEFAULT_STORAGE_KEY = "open-agent:threads:v1";

export function AgentWorkspace({
  agentName = "open-agent",
  client,
  commands = [],
  defaultPreferences,
  extensions = [],
  hostSlots,
  models,
  mentions = [],
  onEvent,
  onDeleteThread,
  onStorageError,
  productName = "Agent",
  reasoningLevels,
  runtimeStatus = { provider: "ready" },
  storageKey = DEFAULT_STORAGE_KEY,
  threadStorage = browserThreadStorage,
}: {
  readonly agentName?: string;
  readonly client?: AgentWorkspaceClientConfig;
  readonly commands?: readonly import("./contracts.js").AgentPromptMenuItem[];
  readonly defaultPreferences: AgentThreadPreferences;
  readonly extensions?: readonly import("./contracts.js").AgentExtensionInfo[];
  readonly hostSlots?: { readonly sidebarFooter?: React.ReactNode; readonly threadHeaderEnd?: React.ReactNode };
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
}) {
  validateWorkspaceCatalog(models, reasoningLevels, defaultPreferences);
  const catalogSignature = JSON.stringify({ models, reasoningLevels });
  const stableDefaults = useMemo<AgentThreadPreferences>(
    () => ({
      modelId: defaultPreferences.modelId,
      reasoning: defaultPreferences.reasoning,
      executionMode: defaultPreferences.executionMode ?? "standard",
    }),
    [defaultPreferences.executionMode, defaultPreferences.modelId, defaultPreferences.reasoning],
  );
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set());
  const [recoveryErrors, setRecoveryErrors] = useState<Map<string, string>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletionIssue, setDeletionIssue] = useState(false);
  const [deletingThreadIds, setDeletingThreadIds] = useState<Set<string>>(new Set());
  const [storageIssue, setStorageIssue] = useState(false);
  const [locale, setLocale] = useState<AgentLocale>("en");
  const recoveryStarted = useRef(new Set<string>());
  const recoveryControllers = useRef(new Map<string, AbortController>());
  const storageSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const storageSaveBlocked = useRef(false);
  const messages = messagesFor(locale);

  useEffect(() => {
    let cancelled = false;
    const restoredLocale = loadLocale(storageKey);
    void Promise.resolve(threadStorage.load(storageKey))
      .then((collection) => {
        if (cancelled) return;
        storageSaveBlocked.current = false;
        setStorageIssue(false);
        const restoredThreads = collection.threads.length > 0
          ? collection.threads.map((thread) => normalizeThreadPreferences(thread, models, reasoningLevels, stableDefaults))
          : [createAgentThread(Date.now(), messagesFor(restoredLocale).newTask, stableDefaults)];
        const restoredActive = collection.activeThreadId &&
          restoredThreads.some((thread) => thread.id === collection.activeThreadId)
          ? collection.activeThreadId
          : restoredThreads[0]?.id;
        setThreads(restoredThreads);
        setActiveThreadId(restoredActive);
        setLocale(restoredLocale);
        setSidebarOpen(window.matchMedia("(min-width: 1024px)").matches);
        setIsHydrated(true);

        const busyThreads = restoredThreads.filter(threadNeedsRecovery);
        if (busyThreads.length > 0) {
          setRecoveringIds(new Set(busyThreads.map((thread) => thread.id)));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        storageSaveBlocked.current = true;
        setStorageIssue(true);
        onStorageError?.(error);
        const fallback = createAgentThread(Date.now(), messagesFor(restoredLocale).newTask, stableDefaults);
        setThreads([fallback]);
        setActiveThreadId(fallback.id);
        setLocale(restoredLocale);
        setSidebarOpen(window.matchMedia("(min-width: 1024px)").matches);
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogSignature, onStorageError, stableDefaults, storageKey, threadStorage]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(`${storageKey}:locale`, locale);
    document.documentElement.lang = locale;
  }, [isHydrated, locale, storageKey]);

  useEffect(() => {
    if (!isHydrated || storageSaveBlocked.current) return;
    const collection = {
      activeThreadId,
      threads,
      version: AGENT_THREAD_STORAGE_VERSION,
    } as const;
    storageSaveQueue.current = storageSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        await threadStorage.save(storageKey, collection);
        setStorageIssue(false);
      })
      .catch((error: unknown) => {
        storageSaveBlocked.current = true;
        setStorageIssue(true);
        onStorageError?.(error);
      });
  }, [activeThreadId, isHydrated, onStorageError, storageKey, threadStorage, threads]);

  const updateThread = useCallback((threadId: string, patch: AgentThreadPatch) => {
    setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : thread));
  }, []);

  const createThread = useCallback(() => {
    const thread = createAgentThread(Date.now(), messages.newTask, stableDefaults);
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    if (!window.matchMedia("(min-width: 1024px)").matches) setSidebarOpen(false);
  }, [messages.newTask, stableDefaults]);

  const deleteThread = useCallback(async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread || deletingThreadIds.has(threadId)) return;
    if (thread && onDeleteThread) {
      setDeletingThreadIds((current) => new Set(current).add(threadId));
      try {
        await onDeleteThread(thread);
        setDeletionIssue(false);
      } catch (error) {
        setDeletionIssue(true);
        onStorageError?.(error);
        setDeletingThreadIds((current) => withoutSetValue(current, threadId));
        return;
      }
      setDeletingThreadIds((current) => withoutSetValue(current, threadId));
    }
    recoveryControllers.current.get(threadId)?.abort();
    recoveryControllers.current.delete(threadId);
    recoveryStarted.current.delete(threadId);
    setRecoveringIds((current) => withoutSetValue(current, threadId));
    setRecoveryErrors((current) => withoutMapKey(current, threadId));
    setThreads((current) => {
      const next = current.filter((thread) => thread.id !== threadId);
      if (next.length === 0) {
        const replacement = createAgentThread(Date.now(), messages.newTask, stableDefaults);
        setActiveThreadId(replacement.id);
        return [replacement];
      }
      if (threadId === activeThreadId) setActiveThreadId(next[0]?.id);
      return next;
    });
  }, [activeThreadId, deletingThreadIds, messages.newTask, onDeleteThread, onStorageError, stableDefaults, threads]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    if (!window.matchMedia("(min-width: 1024px)").matches) setSidebarOpen(false);
    const selected = threads.find((thread) => thread.id === threadId);
    if (selected && threadNeedsRecovery(selected)) {
      setRecoveringIds((current) => new Set(current).add(threadId));
    }
  }, [threads]);

  const renameThread = useCallback((threadId: string, title: string) => {
    const normalized = title.trim();
    if (!normalized) return;
    updateThread(threadId, { title: normalized });
  }, [updateThread]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const changeActiveThread = useCallback(
    (patch: AgentThreadPatch) => {
      if (activeThreadId) updateThread(activeThreadId, patch);
    },
    [activeThreadId, updateThread],
  );

  const recoverThread = useCallback(async (thread: AgentThread) => {
    if (!thread.session.sessionId || recoveryStarted.current.has(thread.id)) return;
    recoveryStarted.current.add(thread.id);
    setRecoveryErrors((current) => withoutMapKey(current, thread.id));
    const controller = new AbortController();
    recoveryControllers.current.set(thread.id, controller);

    // `events` is the authoritative stream log. The session cursor can lag it
    // while an in-flight stream is being persisted during page unload.
    const recoveredCursor = thread.events.length;
    const session = createAgentSession(client, thread.preferences, { ...thread.session, streamIndex: recoveredCursor });
    let cursor = recoveredCursor;
    let events = [...thread.events];
    let settled = false;

    try {
      while (!settled) {
        for await (const event of session.stream({ signal: controller.signal, startIndex: cursor })) {
          events.push(event);
          cursor += 1;
          updateThread(thread.id, { events: [...events], session: { ...session.state, streamIndex: cursor }, status: statusFromEvents(events) });
          if (isRecoveryBoundary(event)) {
            settled = true;
            break;
          }
        }
        if (!settled && !controller.signal.aborted) await wait(600, controller.signal);
      }
      if (controller.signal.aborted) return;
      updateThread(thread.id, { events: [...events], session: session.state, status: statusFromEvents(events) });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      updateThread(thread.id, { status: "error", updatedAt: Date.now() });
      setRecoveryErrors((current) => new Map(current).set(thread.id, error instanceof Error ? error.message : messages.recoveryFailed));
      console.error("Agent session recovery failed", error);
    } finally {
      recoveryStarted.current.delete(thread.id);
      recoveryControllers.current.delete(thread.id);
      setRecoveringIds((current) => {
        const next = new Set(current);
        next.delete(thread.id);
        return next;
      });
    }
  }, [client, messages.recoveryFailed, updateThread]);

  useEffect(() => () => {
    for (const controller of recoveryControllers.current.values()) controller.abort();
    recoveryControllers.current.clear();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    for (const thread of threads) {
      if (recoveringIds.has(thread.id)) void recoverThread(thread);
    }
  }, [isHydrated, recoverThread, recoveringIds, threads]);

  const activeIsRecovering = activeThread
    ? recoveringIds.has(activeThread.id) || recoveryErrors.has(activeThread.id)
    : false;
  const modelLabel = models.find((option) => option.id === activeThread?.preferences.modelId)?.label ?? "Agent";

  if (!isHydrated || !activeThread) return <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">{messages.loading}</div>;

  return (
    <div className="open-agent-ui flex h-dvh overflow-hidden bg-background text-foreground">
      <AgentSidebar activeThreadId={activeThread.id} deletingThreadIds={deletingThreadIds} hostFooter={hostSlots?.sidebarFooter} locale={locale} messages={messages} onClose={() => setSidebarOpen(false)} onDelete={deleteThread} onNew={createThread} onRename={renameThread} onSelect={selectThread} onSettings={() => setSettingsOpen(true)} open={sidebarOpen} threads={threads} />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button aria-label={messages.openNavigation} className="lg:hidden" onClick={() => setSidebarOpen(true)} size="icon-sm" variant="ghost"><MenuIcon className="size-4" /></Button>
            <Button aria-label={messages.toggleNavigation} className="hidden lg:inline-flex" onClick={() => setSidebarOpen((open) => !open)} size="icon-sm" variant="ghost">{sidebarOpen ? <PanelLeftCloseIcon className="size-4" /> : <PanelLeftIcon className="size-4" />}</Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-medium text-[15px]">{activeThread.title}</h2>
                <span className="hidden rounded-full border px-2 py-0.5 text-xs text-muted-foreground sm:inline-flex">{modelLabel}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{productName} · {agentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hostSlots?.threadHeaderEnd}
            <Button aria-label={messages.language} onClick={() => setLocale((current) => current === "en" ? "zh-CN" : "en")} size="icon-sm" variant="ghost"><LanguagesIcon className="size-4" /></Button>
          </div>
        </header>
        {storageIssue ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm" role="alert">
            <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-foreground">{messages.storageUnavailable}</p>
            <Button onClick={() => window.location.reload()} size="sm" variant="outline">
              <RotateCcwIcon className="size-4" />
              {messages.reload}
            </Button>
          </div>
        ) : null}
        {deletionIssue ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm" role="alert">
            <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-foreground">{messages.deleteUnavailable}</p>
            <Button onClick={() => setDeletionIssue(false)} size="sm" variant="outline">{messages.dismiss}</Button>
          </div>
        ) : null}
        {runtimeStatus.provider !== "ready" ? (
          <div className="flex shrink-0 items-start gap-3 border-b border-amber-500/30 bg-amber-500/8 px-4 py-2.5 text-sm" role="status">
            <ServerOffIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="min-w-0 flex-1 text-foreground">{runtimeStatus.provider === "mock" ? messages.mockProvider : messages.providerUnconfigured}</p>
          </div>
        ) : null}
        {activeIsRecovering ? (
          <RecoveryView
            error={recoveryErrors.get(activeThread.id)}
            events={activeThread.events}
            locale={locale}
            onRetry={() => setRecoveringIds((current) => new Set(current).add(activeThread.id))}
          />
        ) : <AgentThreadView client={client} commands={commands} key={activeThread.id} locale={locale} mentions={mentions} models={models} onChange={changeActiveThread} onEvent={onEvent} providerReady={runtimeStatus.provider !== "unconfigured"} reasoningLevels={reasoningLevels} thread={activeThread} />}
      </section>
      <AgentSettingsDialog extensions={extensions} locale={locale} messages={messages} onLocaleChange={setLocale} onOpenChange={setSettingsOpen} open={settingsOpen} />
    </div>
  );
}

function RecoveryView({
  error,
  events,
  locale,
  onRetry,
}: {
  readonly error?: string;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly locale: AgentLocale;
  readonly onRetry: () => void;
}) {
  const reducer = useMemo(() => defaultMessageReducer(), []);
  const data = useMemo(() => events.reduce((current, event) => reducer.reduce(current, event), reducer.initial()), [events, reducer]);
  const messages = messagesFor(locale);
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl gap-8 px-4 py-8 sm:px-8">
          {data.messages.map((message) => <AgentMessage canRespond={false} isStreaming locale={locale} message={message} key={message.id} onInputResponses={() => undefined} />)}
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{messages.recoveryFailed}</p>
                <p className="mt-0.5 break-words text-muted-foreground">{error}</p>
              </div>
              <Button onClick={onRetry} size="sm" variant="outline">
                <RotateCcwIcon className="size-4" />
                {messages.retry}
              </Button>
            </div>
          ) : <div className="text-muted-foreground text-sm">{messages.reconnecting}</div>}
        </ConversationContent>
      </Conversation>
    </main>
  );
}

function isRecoveryBoundary(event: HandleMessageStreamEvent): boolean {
  return event.type === "session.waiting" || event.type === "session.completed" || event.type === "session.failed";
}

function statusFromEvents(events: readonly HandleMessageStreamEvent[]): AgentThread["status"] {
  const last = events.at(-1);
  if (!last) return "ready";
  if (last.type === "session.failed") return "error";
  const latestTurnBoundary = [...events].reverse().find((event) => event.type === "turn.completed" || event.type === "turn.failed" || event.type === "turn.cancelled");
  if (latestTurnBoundary?.type === "turn.failed") return "error";
  if (last.type === "session.waiting" || last.type === "session.completed") return "ready";
  if (last.type === "turn.started" || last.type === "step.started" || last.type === "message.appended" || last.type === "reasoning.appended") return "streaming";
  return "submitted";
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function validateWorkspaceCatalog(
  models: readonly AgentModelOption[],
  reasoningLevels: readonly string[],
  defaults: AgentThreadPreferences,
): void {
  if (models.length === 0 || models.some((model) => !model.id.trim() || !model.label.trim() || !Number.isSafeInteger(model.contextWindowTokens) || model.contextWindowTokens <= 0)) {
    throw new Error("AgentWorkspace requires at least one valid model option.");
  }
  if (new Set(models.map((model) => model.id)).size !== models.length) {
    throw new Error("AgentWorkspace model ids must be unique.");
  }
  if (reasoningLevels.length === 0 || reasoningLevels.some((level) => !level.trim())) {
    throw new Error("AgentWorkspace requires at least one reasoning level.");
  }
  if (!models.some((model) => model.id === defaults.modelId) || !reasoningLevels.includes(defaults.reasoning)) {
    throw new Error("AgentWorkspace defaults must exist in the injected model and reasoning catalogs.");
  }
}

function normalizeThreadPreferences(
  thread: AgentThread,
  models: readonly AgentModelOption[],
  reasoningLevels: readonly string[],
  defaults: AgentThreadPreferences,
): AgentThread {
  const modelId = models.some((model) => model.id === thread.preferences.modelId)
    ? thread.preferences.modelId
    : defaults.modelId;
  const reasoning = reasoningLevels.includes(thread.preferences.reasoning)
    ? thread.preferences.reasoning
    : defaults.reasoning;
  const executionMode = thread.preferences.executionMode ?? defaults.executionMode;
  return modelId === thread.preferences.modelId && reasoning === thread.preferences.reasoning && executionMode === thread.preferences.executionMode
    ? thread
    : { ...thread, preferences: { executionMode, modelId, reasoning } };
}

function withoutSetValue<T>(source: Set<T>, value: T): Set<T> {
  if (!source.has(value)) return source;
  const next = new Set(source);
  next.delete(value);
  return next;
}

function withoutMapKey<K, V>(source: Map<K, V>, key: K): Map<K, V> {
  if (!source.has(key)) return source;
  const next = new Map(source);
  next.delete(key);
  return next;
}

function threadNeedsRecovery(thread: AgentThread): boolean {
  if (!thread.session.sessionId) return false;
  const lastEvent = thread.events.at(-1);
  return !lastEvent || !isRecoveryBoundary(lastEvent);
}

function loadLocale(storageKey: string): AgentLocale {
  const stored = window.localStorage.getItem(`${storageKey}:locale`);
  return stored === "en" || stored === "zh-CN" ? stored : resolveBrowserLocale();
}
