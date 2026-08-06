"use client";

import { ClientError, defaultMessageReducer, type HandleMessageStreamEvent } from "eve/client";
import { AlertCircleIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftIcon, RotateCcwIcon, ServerOffIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { Conversation, ConversationContent } from "../ai-elements/conversation.js";
import { PromptInputProvider, type PromptInputMessage } from "../ai-elements/prompt-input.js";
import { createAgentSession } from "./agent-client.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentComposer } from "./agent-composer.js";
import { AgentMessage } from "./agent-message.js";
import { AgentSettingsDialog } from "./agent-settings-dialog.js";
import { AgentSidebar } from "./agent-sidebar.js";
import { AgentThreadView } from "./agent-thread.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThread, AgentThreadPatch, AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
import { messagesFor, resolveBrowserLocale, type AgentLocale } from "./i18n.js";
import {
  AGENT_THREAD_STORAGE_VERSION,
  browserThreadStorage,
  appendThreadEvent,
  compactThreadEvents,
  createAgentThread,
  type AgentThreadCollection,
  type AgentThreadStorage,
} from "./thread-storage.js";
import {
  hasUnresolvedInputRequests,
  isProxiedInputOnlyMessage,
} from "./turn-presentation.js";
import { summarizeUsage } from "./usage.js";

const DEFAULT_STORAGE_KEY = "open-agent:threads:v1";
const STORAGE_SAVE_DELAY_MS = 250;

export function AgentWorkspace({
  client,
  commands = [],
  defaultPreferences,
  extensions = [],
  hostSlots,
  initialThreadId,
  models,
  mentions = [],
  onEvent,
  onDeleteThread,
  onActiveThreadChange,
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
  readonly initialThreadId?: string;
  readonly models: readonly AgentModelOption[];
  readonly mentions?: readonly import("./contracts.js").AgentPromptMenuItem[];
  readonly onEvent?: (event: HandleMessageStreamEvent) => void;
  readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
  readonly onActiveThreadChange?: (threadId: string) => void;
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
  const storageSaveTimer = useRef<number | undefined>(undefined);
  const pendingCollection = useRef<AgentThreadCollection | undefined>(undefined);
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
        const requestedActive = initialThreadId &&
          restoredThreads.some((thread) => thread.id === initialThreadId)
          ? initialThreadId
          : undefined;
        const restoredActive = requestedActive ?? (collection.activeThreadId &&
          restoredThreads.some((thread) => thread.id === collection.activeThreadId)
          ? collection.activeThreadId
          : restoredThreads[0]?.id);
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
  }, [catalogSignature, initialThreadId, onStorageError, stableDefaults, storageKey, threadStorage]);

  useEffect(() => {
    if (isHydrated && activeThreadId) onActiveThreadChange?.(activeThreadId);
  }, [activeThreadId, isHydrated, onActiveThreadChange]);

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
    pendingCollection.current = collection;
    if (storageSaveTimer.current !== undefined) return;
    storageSaveTimer.current = window.setTimeout(() => {
      storageSaveTimer.current = undefined;
      const nextCollection = pendingCollection.current;
      if (!nextCollection) return;
      storageSaveQueue.current = storageSaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          await threadStorage.save(storageKey, nextCollection);
          setStorageIssue(false);
        })
        .catch((error: unknown) => {
          storageSaveBlocked.current = true;
          setStorageIssue(true);
          onStorageError?.(error);
        });
    }, STORAGE_SAVE_DELAY_MS);
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

  const requestThreadRecovery = useCallback((threadId: string) => {
    setRecoveryErrors((current) => withoutMapKey(current, threadId));
    setRecoveringIds((current) => new Set(current).add(threadId));
  }, []);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const changeActiveThread = useCallback(
    (patch: AgentThreadPatch) => {
      if (activeThreadId) updateThread(activeThreadId, patch);
    },
    [activeThreadId, updateThread],
  );
  const recoverActiveThread = useCallback(() => {
    if (activeThreadId) requestThreadRecovery(activeThreadId);
  }, [activeThreadId, requestThreadRecovery]);

  const recoverThread = useCallback(async (thread: AgentThread) => {
    if (!thread.session.sessionId || recoveryStarted.current.has(thread.id)) return;
    recoveryStarted.current.add(thread.id);
    setRecoveryErrors((current) => withoutMapKey(current, thread.id));
    const controller = new AbortController();
    recoveryControllers.current.set(thread.id, controller);

    const recoveredCursor = thread.session.streamIndex;
    const session = createAgentSession(client, thread.preferences, { ...thread.session, streamIndex: recoveredCursor });
    let cursor = recoveredCursor;
    let events = [...thread.events];
    let checkedTailBoundary = false;
    let recoveredContinuationToken = thread.session.continuationToken;
    let settled = false;

    try {
      while (!settled && !controller.signal.aborted) {
        try {
          let consumed = 0;
          for await (const event of session.stream({ follow: false, signal: controller.signal, startIndex: cursor })) {
            events = [...appendThreadEvent(events, event)];
            cursor += 1;
            consumed += 1;
            if (event.type === "session.waiting") recoveredContinuationToken = event.data.continuationToken;
            updateThread(thread.id, { events: [...events], session: { ...session.state, streamIndex: cursor }, status: statusFromEvents(events) });
            if (isRecoveryBoundary(event)) {
              settled = true;
              break;
            }
          }
          if (!settled && consumed === 0 && !checkedTailBoundary && events.length > 0 && !isRecoveryBoundary(events.at(-1)!)) {
            checkedTailBoundary = true;
            const missingBoundary = await readTailBoundary(session, controller.signal);
            if (missingBoundary) {
              events = [...appendThreadEvent(events, missingBoundary)];
              recoveredContinuationToken = missingBoundary.type === "session.waiting"
                ? missingBoundary.data.continuationToken
                : session.state.continuationToken;
              updateThread(thread.id, {
                events: [...events],
                session: { ...session.state, continuationToken: recoveredContinuationToken, streamIndex: cursor },
                status: statusFromEvents(events),
              });
              settled = true;
            }
          }
          setRecoveryErrors((current) => withoutMapKey(current, thread.id));
        } catch (error) {
          if (controller.signal.aborted || isAbortError(error)) return;
          if (!isRetryableRecoveryError(error)) throw error;
        }
        if (!settled && !controller.signal.aborted) await waitForRecoveryPoll(controller.signal);
      }
      if (controller.signal.aborted) return;
      if (!settled) throw new Error("The active Agent stream ended before reaching a durable boundary.");
      updateThread(thread.id, {
        events: compactThreadEvents(events),
        session: { ...session.state, continuationToken: recoveredContinuationToken ?? session.state.continuationToken, streamIndex: cursor },
        status: statusFromEvents(events),
      });
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
    window.clearTimeout(storageSaveTimer.current);
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
  const stopRecoveringThread = useCallback(async (thread: AgentThread) => {
    if (!thread.session.sessionId) return;
    try {
      const session = createAgentSession(client, thread.preferences, thread.session);
      const turnId = latestTurnId(thread.events);
      await session.cancel(turnId ? { turnId } : undefined);
      setRecoveryErrors((current) => withoutMapKey(current, thread.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : messages.recoveryFailed;
      setRecoveryErrors((current) => new Map(current).set(thread.id, message));
      console.error("Agent recovery cancellation failed", error);
    }
  }, [client, messages.recoveryFailed]);

  if (!isHydrated || !activeThread) return <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">{messages.loading}</div>;

  return (
    <div className="open-agent-ui flex h-dvh overflow-hidden bg-background text-foreground">
      <AgentSidebar activeThreadId={activeThread.id} brand={productName} deletingThreadIds={deletingThreadIds} hostFooter={hostSlots?.sidebarFooter} locale={locale} messages={messages} onClose={() => setSidebarOpen(false)} onDelete={deleteThread} onNew={createThread} onRename={renameThread} onSelect={selectThread} onSettings={() => setSettingsOpen(true)} open={sidebarOpen} threads={threads} />
      <section className="flex min-w-0 flex-1 flex-col bg-card">
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-border/70 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button aria-label={messages.openNavigation} className="lg:hidden" onClick={() => setSidebarOpen(true)} size="icon-sm" variant="ghost"><MenuIcon className="size-4" /></Button>
            <Button aria-label={messages.toggleNavigation} className="hidden lg:inline-flex" onClick={() => setSidebarOpen((open) => !open)} size="icon-sm" variant="ghost">{sidebarOpen ? <PanelLeftCloseIcon className="size-4" /> : <PanelLeftIcon className="size-4" />}</Button>
            <h2 className="truncate font-medium text-[15px]">{activeThread.title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {hostSlots?.threadHeaderEnd}
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
            commands={commands}
            error={recoveryErrors.get(activeThread.id)}
            locale={locale}
            mentions={mentions}
            models={models}
            onPreferencesChange={(preferences) => updateThread(activeThread.id, { preferences })}
            onRetry={() => setRecoveringIds((current) => new Set(current).add(activeThread.id))}
            onStop={() => void stopRecoveringThread(activeThread)}
            providerReady={runtimeStatus.provider !== "unconfigured"}
            reasoningLevels={reasoningLevels}
            thread={activeThread}
          />
        ) : <AgentThreadView client={client} commands={commands} key={activeThread.id} locale={locale} mentions={mentions} models={models} onChange={changeActiveThread} onEvent={onEvent} onRecoveryNeeded={recoverActiveThread} providerReady={runtimeStatus.provider !== "unconfigured"} reasoningLevels={reasoningLevels} thread={activeThread} />}
      </section>
      <AgentSettingsDialog extensions={extensions} locale={locale} messages={messages} onLocaleChange={setLocale} onOpenChange={setSettingsOpen} open={settingsOpen} />
    </div>
  );
}

function RecoveryView({
  commands,
  error,
  locale,
  mentions,
  models,
  onPreferencesChange,
  onRetry,
  onStop,
  providerReady,
  reasoningLevels,
  thread,
}: {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly error?: string;
  readonly locale: AgentLocale;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly models: readonly AgentModelOption[];
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly onRetry: () => void;
  readonly onStop: () => void;
  readonly providerReady: boolean;
  readonly reasoningLevels: readonly string[];
  readonly thread: AgentThread;
}) {
  const reducer = useMemo(() => defaultMessageReducer(), []);
  const data = useMemo(() => thread.events.reduce((current, event) => reducer.reduce(current, event), reducer.initial()), [reducer, thread.events]);
  const visibleMessages = data.messages.filter((message) =>
    !isProxiedInputOnlyMessage(message, thread.events),
  );
  const messages = messagesFor(locale);
  return (
    <PromptInputProvider>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-7 px-4 py-8 sm:px-6 lg:py-10">
            {visibleMessages.map((message) => <AgentMessage canRespond={false} events={thread.events} fallbackStartedAt={thread.pendingTurn?.submittedAt} isStreaming locale={locale} message={message} key={message.id} onInputResponses={() => undefined} />)}
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
            ) : (
              <AgentActivity
                events={thread.events}
                messages={messages}
                mode="recovery"
              />
            )}
          </ConversationContent>
        </Conversation>
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6">
          <AgentComposer
            commands={commands}
            disabled={!providerReady}
            inputDisabled
            mentions={mentions}
            messages={messages}
            models={models}
            onPreferencesChange={onPreferencesChange}
            onStop={onStop}
            onSubmit={ignoreRecoverySubmit}
            preferences={thread.preferences}
            reasoningLevels={reasoningLevels}
            status="streaming"
            usage={summarizeUsage(thread.events)}
          />
        </div>
      </main>
    </PromptInputProvider>
  );
}

const RECOVERY_POLL_INTERVAL_MS = 1_500;
const RECOVERY_TAIL_LOOKUP_TIMEOUT_MS = 1_500;

async function ignoreRecoverySubmit(_message: PromptInputMessage): Promise<void> {}

function latestTurnId(events: readonly HandleMessageStreamEvent[]): string | undefined {
  const event = [...events].reverse().find((candidate) => candidate.type === "turn.started");
  return event?.type === "turn.started" ? event.data.turnId : undefined;
}

async function readTailBoundary(
  session: ReturnType<typeof createAgentSession>,
  parentSignal: AbortSignal,
): Promise<HandleMessageStreamEvent | undefined> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parentSignal.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, RECOVERY_TAIL_LOOKUP_TIMEOUT_MS);
  try {
    for await (const event of session.stream({
      signal: controller.signal,
      startIndex: -1,
      streamReconnectPolicy: { reconnect: false },
    })) {
      return isRecoveryBoundary(event) ? event : undefined;
    }
  } catch (error) {
    if (!controller.signal.aborted && !isAbortError(error)) throw error;
  } finally {
    window.clearTimeout(timeout);
    parentSignal.removeEventListener("abort", abort);
  }
  return undefined;
}

function waitForRecoveryPoll(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, RECOVERY_POLL_INTERVAL_MS);
    signal.addEventListener("abort", finish, { once: true });
  });
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
  if (last.type === "session.waiting") {
    return hasUnresolvedInputRequests(events) ? "waiting" : "ready";
  }
  if (last.type === "session.completed") return "ready";
  if (last.type === "turn.started" || last.type === "step.started" || last.type === "message.appended" || last.type === "reasoning.appended") return "streaming";
  return "submitted";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRetryableRecoveryError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return error.status === 0 || [404, 409, 425, 429, 500, 502, 503, 504].includes(error.status);
  }
  return error instanceof TypeError || (error instanceof Error && /fetch|network|socket|stream/i.test(error.message));
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
