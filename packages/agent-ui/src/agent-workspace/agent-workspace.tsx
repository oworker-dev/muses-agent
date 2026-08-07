"use client";

import { ClientError, type ClientSession, type MessageStreamEvent } from "eve/client";
import { AlertCircleIcon, ArrowLeftIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftIcon, RotateCcwIcon, ServerOffIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable.js";
import { usePanelRef } from "react-resizable-panels";
import { attachAgentSession, createAgentSession } from "./agent-client.js";
import { AgentChildSessionView } from "./agent-child-session.js";
import { AgentSettingsDialog } from "./agent-settings-dialog.js";
import { AgentSidebar } from "./agent-sidebar.js";
import { AgentSubagentMenu } from "./agent-subagent-menu.js";
import { AgentThreadView } from "./agent-thread.js";
import type { AgentModelOption, AgentQueuedTurn, AgentThread, AgentThreadPatch, AgentThreadPreferences, AgentWorkspaceClientConfig, AgentWorkspaceMailbox } from "./contracts.js";
import { sanitizeAgentError } from "./error-presentation.js";
import { AgentThreadStorageConflictError } from "./http-thread-storage.js";
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
  presentSubagentSessions,
} from "./turn-presentation.js";

const DEFAULT_STORAGE_KEY = "open-agent:threads:v1";
const STORAGE_SAVE_DELAY_MS = 250;

export function AgentWorkspace({
  client,
  commands = [],
  defaultPreferences,
  extensions = [],
  hostSlots,
  initialSubagentSessionId,
  initialThreadId,
  mailbox,
  models,
  mentions = [],
  onEvent,
  onDeleteThread,
  onActiveSubagentChange,
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
  readonly initialSubagentSessionId?: string;
  readonly initialThreadId?: string;
  readonly mailbox?: AgentWorkspaceMailbox;
  readonly models: readonly AgentModelOption[];
  readonly mentions?: readonly import("./contracts.js").AgentPromptMenuItem[];
  readonly onEvent?: (event: MessageStreamEvent) => void;
  readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
  readonly onActiveSubagentChange?: (threadId: string, sessionId?: string) => void;
  readonly onActiveThreadChange?: (threadId?: string) => void;
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
  const threadsRef = useRef<readonly AgentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>();
  const [activeSubagentSessionId, setActiveSubagentSessionId] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set());
  const [recoveryErrors, setRecoveryErrors] = useState<Map<string, string>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopLayout, setDesktopLayout] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletionIssue, setDeletionIssue] = useState(false);
  const [deletingThreadIds, setDeletingThreadIds] = useState<Set<string>>(new Set());
  const [storageIssue, setStorageIssue] = useState(false);
  const [ephemeralThreadIds, setEphemeralThreadIds] = useState<Set<string>>(new Set());
  const [locale, setLocale] = useState<AgentLocale>("en");
  const recoveryStarted = useRef(new Set<string>());
  const recoveryControllers = useRef(new Map<string, AbortController>());
  const storageSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const storageSaveTimer = useRef<number | undefined>(undefined);
  const pendingCollection = useRef<AgentThreadCollection | undefined>(undefined);
  const messages = messagesFor(locale);
  const sidebarPanelRef = usePanelRef();

  useEffect(() => {
    if (!desktopLayout || !sidebarPanelRef.current) return;
    if (sidebarOpen) sidebarPanelRef.current.expand();
    else sidebarPanelRef.current.collapse();
  }, [desktopLayout, sidebarOpen, sidebarPanelRef]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const synchronizeLayout = () => {
      setDesktopLayout(media.matches);
      setSidebarOpen(media.matches);
    };
    synchronizeLayout();
    media.addEventListener("change", synchronizeLayout);
    return () => media.removeEventListener("change", synchronizeLayout);
  }, []);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    let cancelled = false;
    const restoredLocale = loadLocale(storageKey);
    void Promise.resolve(threadStorage.load(storageKey))
      .then((collection) => {
        if (cancelled) return;
        setStorageIssue(false);
        const storedThreads = collection.threads.map((thread) =>
          normalizeThreadPreferences(thread, models, reasoningLevels, stableDefaults)
        );
        const requestedActive = initialThreadId &&
          storedThreads.some((thread) => thread.id === initialThreadId)
          ? initialThreadId
          : undefined;
        const cleanThread = createAgentThread(Date.now(), messagesFor(restoredLocale).newTask, stableDefaults);
        const routeThread = initialThreadId && !requestedActive
          ? { ...cleanThread, id: initialThreadId }
          : undefined;
        const rootThread = initialThreadId ? undefined : cleanThread;
        const restoredThreads = routeThread
          ? [routeThread, ...storedThreads]
          : rootThread
            ? [rootThread, ...storedThreads]
            : storedThreads;
        const restoredActive = requestedActive ?? routeThread?.id ?? rootThread?.id ?? restoredThreads[0]?.id;
        setThreads(restoredThreads);
        setActiveThreadId(restoredActive);
        setEphemeralThreadIds(rootThread ? new Set([rootThread.id]) : new Set());
        setActiveSubagentSessionId(requestedActive ? initialSubagentSessionId : undefined);
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
        setStorageIssue(true);
        onStorageError?.(error);
        const fallback = createAgentThread(Date.now(), messagesFor(restoredLocale).newTask, stableDefaults);
        setThreads([fallback]);
        setActiveThreadId(fallback.id);
        setEphemeralThreadIds(new Set([fallback.id]));
        setActiveSubagentSessionId(undefined);
        setLocale(restoredLocale);
        setSidebarOpen(window.matchMedia("(min-width: 1024px)").matches);
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogSignature, initialSubagentSessionId, initialThreadId, onStorageError, stableDefaults, storageKey, threadStorage]);

  useEffect(() => {
    if (!isHydrated || !activeThreadId) return;
    if (ephemeralThreadIds.has(activeThreadId)) {
      onActiveThreadChange?.(undefined);
      return;
    }
    if (activeSubagentSessionId) {
      onActiveSubagentChange?.(activeThreadId, activeSubagentSessionId);
      return;
    }
    onActiveThreadChange?.(activeThreadId);
  }, [activeSubagentSessionId, activeThreadId, ephemeralThreadIds, isHydrated, onActiveSubagentChange, onActiveThreadChange]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(`${storageKey}:locale`, locale);
    document.documentElement.lang = locale;
  }, [isHydrated, locale, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    const persistedThreads = threads.filter((thread) => !ephemeralThreadIds.has(thread.id));
    const collection = {
      activeThreadId: activeThreadId && !ephemeralThreadIds.has(activeThreadId)
        ? activeThreadId
        : undefined,
      threads: persistedThreads,
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
          const saved = await saveThreadCollectionWithConflictRecovery(
            storageKey,
            nextCollection,
            threadStorage,
          );
          if (!sameThreadCollection(saved, nextCollection)) {
            setThreads((current) => mergeVisibleThreads(current, saved.threads, ephemeralThreadIds));
          }
          setStorageIssue(false);
        })
        .catch((error: unknown) => {
          setStorageIssue(true);
          onStorageError?.(error);
        });
    }, STORAGE_SAVE_DELAY_MS);
  }, [activeThreadId, ephemeralThreadIds, isHydrated, onStorageError, storageKey, threadStorage, threads]);

  const updateThread = useCallback((threadId: string, patch: AgentThreadPatch) => {
    if (patch.pendingTurn || patch.events?.length || patch.session?.sessionId) {
      setEphemeralThreadIds((current) => withoutSetValue(current, threadId));
    }
    setThreads((current) => {
      const next = current.map((thread) => thread.id === threadId
        ? { ...thread, ...patch, updatedAt: patch.updatedAt ?? Date.now() }
        : thread);
      threadsRef.current = next;
      return next;
    });
  }, []);

  const createThread = useCallback(() => {
    const active = activeThreadId ? threadsRef.current.find((thread) => thread.id === activeThreadId) : undefined;
    // Keep one draft placeholder. A repeated click while the user is already
    // on an untouched session should focus that same draft instead of filling
    // the recent-session list with unusable empty rows.
    if (active && ephemeralThreadIds.has(active.id) && isEmptyDraftThread(active)) {
      setActiveSubagentSessionId(undefined);
      if (!window.matchMedia("(min-width: 1024px)").matches) setSidebarOpen(false);
      return;
    }
    const thread = createAgentThread(Date.now(), messages.newTask, stableDefaults);
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setEphemeralThreadIds((current) => new Set(current).add(thread.id));
    setActiveSubagentSessionId(undefined);
    if (!window.matchMedia("(min-width: 1024px)").matches) setSidebarOpen(false);
  }, [activeThreadId, ephemeralThreadIds, messages.newTask, stableDefaults]);

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
    setEphemeralThreadIds((current) => withoutSetValue(current, threadId));
    setRecoveringIds((current) => withoutSetValue(current, threadId));
    setRecoveryErrors((current) => withoutMapKey(current, threadId));
    setThreads((current) => {
      const next = current.filter((thread) => thread.id !== threadId);
      if (next.length === 0) {
        const replacement = createAgentThread(Date.now(), messages.newTask, stableDefaults);
        setActiveThreadId(replacement.id);
        setEphemeralThreadIds((current) => new Set(current).add(replacement.id));
        setActiveSubagentSessionId(undefined);
        return [replacement];
      }
      if (threadId === activeThreadId) {
        setActiveThreadId(next[0]?.id);
        setActiveSubagentSessionId(undefined);
      }
      return next;
    });
  }, [activeThreadId, deletingThreadIds, messages.newTask, onDeleteThread, onStorageError, stableDefaults, threads]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setActiveSubagentSessionId(undefined);
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
  const activeSubagent = activeThread && activeSubagentSessionId
    ? findSubagentSession(activeThread.events, activeSubagentSessionId, locale)
    : undefined;
  const openSubagent = useCallback((sessionId: string) => {
    if (!activeThread || !findSubagentSession(activeThread.events, sessionId, locale)) return;
    setActiveSubagentSessionId(sessionId);
  }, [activeThread, locale]);
  const closeSubagent = useCallback(() => setActiveSubagentSessionId(undefined), []);
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
    const connection = createAgentSession(client, thread.preferences, { ...thread.session, streamIndex: recoveredCursor });
    const session = attachAgentSession(connection, connection.initialSession);
    if (!session) return;
    let cursor = recoveredCursor;
    let events = [...thread.events];
    let checkedTailBoundary = false;
    let pendingTurn = thread.pendingTurn;
    let queuedTurns = thread.queuedTurns;
    let settled = false;

    const refreshMailboxQueue = async () => {
      queuedTurns = threadsRef.current.find((candidate) => candidate.id === thread.id)?.queuedTurns ?? queuedTurns;
      if (!mailbox) return;
      const updates = new Map<string, AgentQueuedTurn["state"] | "remove">();
      await Promise.all(queuedTurns.map(async (turn) => {
        if (turn.delivery !== "server" || !turn.mailboxItemId) return;
        try {
          const receipt = await mailbox.inspect(turn.mailboxItemId);
          const state = mailboxQueueState(receipt.status);
          updates.set(turn.id, state === "cancelled" ? "remove" : state);
        } catch {
          // Keep the last durable UI snapshot during a transient mailbox outage.
        }
      }));
      if (updates.size === 0) return;
      const next = queuedTurns.flatMap((turn) => {
        const state = updates.get(turn.id);
        if (state === "remove") return [];
        return state ? [{ ...turn, state }] : [turn];
      });
      if (sameQueuedTurns(queuedTurns, next)) return;
      queuedTurns = next;
      updateThread(thread.id, { queuedTurns });
    };
    const hasPendingServerQueue = () => queuedTurns.some((turn) =>
      turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId),
    );
    const currentBoundarySettles = () => {
      const last = events.at(-1);
      if (!last || !isRecoveryBoundary(last)) return false;
      return last.type !== "session.waiting" || !hasPendingServerQueue();
    };

    try {
      while (!settled && !controller.signal.aborted) {
        try {
          await refreshMailboxQueue();
          if (currentBoundarySettles()) {
            settled = true;
            break;
          }

          let consumed = 0;
          for await (const event of session.stream({ follow: false, signal: controller.signal, startIndex: cursor })) {
            events = [...appendThreadEvent(events, event)];
            cursor += 1;
            consumed += 1;
            onEvent?.(event);
            if (event.type === "message.received") {
              const wasPendingTurn = Boolean(pendingTurn);
              pendingTurn = undefined;
              if (!wasPendingTurn) {
                const nextServerTurn = queuedTurns.find((turn) =>
                  turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId),
                );
                if (nextServerTurn) {
                  queuedTurns = queuedTurns.filter((turn) => turn.id !== nextServerTurn.id);
                }
              }
            }
            updateThread(thread.id, {
              events: [...events],
              pendingTurn,
              queuedTurns,
              session: { ...session.state, streamIndex: cursor },
              status: statusFromEvents(events),
            });
            if (isRecoveryBoundary(event)) {
              await refreshMailboxQueue();
              settled = event.type !== "session.waiting" || !hasPendingServerQueue();
              break;
            }
          }
          if (!settled && consumed === 0 && !checkedTailBoundary && events.length > 0 && !isRecoveryBoundary(events.at(-1)!)) {
            checkedTailBoundary = true;
            const missingBoundary = await readTailBoundary(session, controller.signal);
            if (missingBoundary) {
              events = [...appendThreadEvent(events, missingBoundary)];
              await refreshMailboxQueue();
              updateThread(thread.id, {
                events: [...events],
                pendingTurn,
                queuedTurns,
                session: { ...session.state, streamIndex: cursor },
                status: statusFromEvents(events),
              });
              settled = missingBoundary.type !== "session.waiting" || !hasPendingServerQueue();
            }
          }
          await refreshMailboxQueue();
          if (!settled && currentBoundarySettles()) settled = true;
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
        pendingTurn,
        queuedTurns,
        session: { ...session.state, streamIndex: cursor },
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
  }, [client, mailbox, messages.recoveryFailed, onEvent, updateThread]);

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

  const activeIsRecovering = activeThread ? recoveringIds.has(activeThread.id) : false;
  const retryStorageSave = useCallback(() => {
    setStorageIssue(false);
    setThreads((current) => [...current]);
  }, []);

  if (!isHydrated || !activeThread) return <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">{messages.loading}</div>;

  return (
    <div className="open-agent-ui relative h-dvh overflow-hidden bg-sidebar text-foreground">
      {!desktopLayout ? <AgentSidebar activeThreadId={activeThread.id} brand={productName} deletingThreadIds={deletingThreadIds} hostFooter={hostSlots?.sidebarFooter} locale={locale} messages={messages} onClose={() => setSidebarOpen(false)} onDelete={deleteThread} onNew={createThread} onRename={renameThread} onSelect={selectThread} onSettings={() => setSettingsOpen(true)} open={sidebarOpen} threads={threads} variant="mobile" /> : null}
      <ResizablePanelGroup className="h-full" orientation="horizontal">
        {desktopLayout ? (
          <ResizablePanel className="block" collapsedSize="0px" collapsible defaultSize="252px" id="agent-sidebar" maxSize="420px" minSize="220px" panelRef={sidebarPanelRef}>
            <AgentSidebar activeThreadId={activeThread.id} brand={productName} deletingThreadIds={deletingThreadIds} hostFooter={hostSlots?.sidebarFooter} locale={locale} messages={messages} onClose={() => setSidebarOpen(false)} onDelete={deleteThread} onNew={createThread} onRename={renameThread} onSelect={selectThread} onSettings={() => setSettingsOpen(true)} open={sidebarOpen} threads={threads} variant="desktop" />
          </ResizablePanel>
        ) : null}
        {desktopLayout ? <ResizableHandle className="flex bg-transparent after:w-2" /> : null}
        <ResizablePanel className="min-w-0" defaultSize="100%" id="agent-workbench" minSize="0px">
      <section className="flex h-full min-w-0 flex-col overflow-hidden bg-card lg:mt-2 lg:rounded-tl-2xl lg:shadow-[-10px_-8px_32px_-18px_rgba(15,23,42,0.38)]" data-slot="agent-workbench">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-3 lg:h-13 lg:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button aria-label={messages.openNavigation} className="lg:hidden" onClick={() => setSidebarOpen(true)} size="icon-sm" variant="ghost"><MenuIcon className="size-4" /></Button>
            <Button aria-label={messages.toggleNavigation} className="hidden lg:inline-flex" onClick={() => setSidebarOpen((open) => !open)} size="icon-sm" variant="ghost">{sidebarOpen ? <PanelLeftCloseIcon className="size-4" /> : <PanelLeftIcon className="size-4" />}</Button>
            {activeSubagentSessionId ? (
              <Button aria-label={messages.backToTask} onClick={closeSubagent} size="icon-sm" variant="ghost">
                <ArrowLeftIcon className="size-4" />
              </Button>
            ) : null}
            <h2 className="truncate font-medium text-[15px]">
              {activeSubagentSessionId ? activeSubagent?.label ?? messages.subagentSession : activeThread.title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <AgentSubagentMenu
              activeSessionId={activeSubagentSessionId}
              events={activeThread.events}
              locale={locale}
              onOpen={openSubagent}
            />
            {hostSlots?.threadHeaderEnd}
          </div>
        </header>
        {storageIssue ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm" role="alert">
            <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-foreground">{messages.storageUnavailable}</p>
            <Button onClick={retryStorageSave} size="sm" variant="outline">
              <RotateCcwIcon className="size-4" />
              {messages.retry}
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
        {activeSubagentSessionId ? (
          activeSubagent ? (
            <AgentChildSessionView
              client={client}
              locale={locale}
              preferences={activeThread.preferences}
              sessionId={activeSubagentSessionId}
            />
          ) : (
            <UnavailableSubagentView locale={locale} onBack={closeSubagent} />
          )
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {recoveryErrors.get(activeThread.id) ? (
              <div className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm" role="alert">
                <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
                <p className="min-w-0 flex-1 break-words text-foreground">{sanitizeAgentError(recoveryErrors.get(activeThread.id)!)}</p>
                <Button onClick={() => requestThreadRecovery(activeThread.id)} size="sm" variant="outline">
                  <RotateCcwIcon className="size-4" />
                  {messages.retry}
                </Button>
              </div>
            ) : null}
            <AgentThreadView
              client={client}
              commands={commands}
              draftStorageKey={ephemeralThreadIds.has(activeThread.id)
                ? `${storageKey}:draft:new`
                : `${storageKey}:draft:${activeThread.id}`}
              isRecovering={activeIsRecovering}
              key={`${activeThread.id}:${activeThread.revision ?? 0}:${activeIsRecovering ? "recovering" : "ready"}`}
              locale={locale}
              mailbox={mailbox}
              mentions={mentions}
              models={models}
              onChange={changeActiveThread}
              onEvent={onEvent}
              onOpenSubagent={openSubagent}
              onRecoveryNeeded={recoverActiveThread}
              providerReady={runtimeStatus.provider !== "unconfigured"}
              reasoningLevels={reasoningLevels}
              thread={activeThread}
            />
          </div>
        )}
      </section>
        </ResizablePanel>
      </ResizablePanelGroup>
      <AgentSettingsDialog extensions={extensions} locale={locale} messages={messages} onLocaleChange={setLocale} onOpenChange={setSettingsOpen} open={settingsOpen} />
    </div>
  );
}

function findSubagentSession(
  events: readonly MessageStreamEvent[],
  sessionId: string,
  locale: AgentLocale,
): { readonly label: string; readonly task?: string } | undefined {
  const sessions = presentSubagentSessions(events);
  const index = sessions.findIndex((candidate) => candidate.childSessionId === sessionId);
  const session = sessions[index];
  if (!session) return undefined;
  return {
    label: session.name && session.name !== "agent"
      ? session.name
      : locale === "zh-CN" ? `子代理 ${index + 1}` : `Sub-agent ${index + 1}`,
    ...(session.task ? { task: session.task } : {}),
  };
}

function UnavailableSubagentView({
  locale,
  onBack,
}: {
  readonly locale: AgentLocale;
  readonly onBack: () => void;
}) {
  const messages = messagesFor(locale);
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <AlertCircleIcon className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{messages.subagentUnavailable}</p>
        <Button className="mt-4" onClick={onBack} size="sm" variant="outline">
          <ArrowLeftIcon className="size-4" />
          {messages.backToTask}
        </Button>
      </div>
    </main>
  );
}

const RECOVERY_POLL_INTERVAL_MS = 1_500;
const RECOVERY_TAIL_LOOKUP_TIMEOUT_MS = 1_500;

async function readTailBoundary(
  session: ClientSession,
  parentSignal: AbortSignal,
): Promise<MessageStreamEvent | undefined> {
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

function isRecoveryBoundary(event: MessageStreamEvent): boolean {
  return event.type === "session.waiting" || event.type === "session.completed" || event.type === "session.failed";
}

function statusFromEvents(events: readonly MessageStreamEvent[]): AgentThread["status"] {
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
  if (thread.queuedTurns.some((turn) =>
    turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId)
  )) return true;
  const lastEvent = thread.events.at(-1);
  return !lastEvent || !isRecoveryBoundary(lastEvent);
}

function isEmptyDraftThread(thread: AgentThread): boolean {
  return thread.events.length === 0 &&
    thread.queuedTurns.length === 0 &&
    !thread.pendingTurn &&
    !thread.session.sessionId;
}

function sameQueuedTurns(
  left: readonly AgentQueuedTurn[],
  right: readonly AgentQueuedTurn[],
): boolean {
  return left.length === right.length && left.every((turn, index) => {
    const candidate = right[index];
    return candidate?.id === turn.id &&
      candidate.mailboxItemId === turn.mailboxItemId &&
      candidate.state === turn.state;
  });
}

function mailboxQueueState(
  status: import("./contracts.js").AgentMailboxItemStatus,
): AgentQueuedTurn["state"] | "cancelled" {
  if (status === "failed") return "delivery-failed";
  if (status === "submission-ambiguous") return "admission-ambiguous";
  if (status === "cancelled") return "cancelled";
  return "queued";
}

async function saveThreadCollectionWithConflictRecovery(
  storageKey: string,
  collection: AgentThreadCollection,
  storage: AgentThreadStorage,
): Promise<AgentThreadCollection> {
  let candidate = collection;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await storage.save(storageKey, candidate);
      return candidate;
    } catch (error) {
      if (!(error instanceof AgentThreadStorageConflictError) || attempt === 2) throw error;
      const remote = await storage.load(storageKey);
      candidate = mergeThreadCollections(candidate, remote);
    }
  }
  return candidate;
}

function mergeThreadCollections(
  local: AgentThreadCollection,
  remote: AgentThreadCollection,
): AgentThreadCollection {
  const threads = mergeThreads(local.threads, remote.threads);
  const activeThreadId = local.activeThreadId && threads.some((thread) => thread.id === local.activeThreadId)
    ? local.activeThreadId
    : remote.activeThreadId;
  return {
    ...(activeThreadId ? { activeThreadId } : {}),
    threads,
    version: AGENT_THREAD_STORAGE_VERSION,
  };
}

function mergeThreads(
  preferred: readonly AgentThread[],
  fallback: readonly AgentThread[],
): AgentThread[] {
  const byId = new Map(fallback.map((thread) => [thread.id, thread]));
  for (const thread of preferred) {
    const existing = byId.get(thread.id);
    if (!existing || thread.updatedAt >= existing.updatedAt) byId.set(thread.id, thread);
  }
  return [...byId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

function mergeVisibleThreads(
  current: readonly AgentThread[],
  persisted: readonly AgentThread[],
  ephemeralIds: ReadonlySet<string>,
): AgentThread[] {
  const ephemeral = current.filter((thread) => ephemeralIds.has(thread.id));
  const localPersisted = current.filter((thread) => !ephemeralIds.has(thread.id));
  return [...ephemeral, ...mergeThreads(localPersisted, persisted)];
}

function sameThreadCollection(
  left: AgentThreadCollection,
  right: AgentThreadCollection,
): boolean {
  return left.activeThreadId === right.activeThreadId &&
    left.threads.length === right.threads.length &&
    left.threads.every((thread, index) => {
      const candidate = right.threads[index];
      return candidate?.id === thread.id && candidate.updatedAt === thread.updatedAt;
    });
}

function loadLocale(storageKey: string): AgentLocale {
  const stored = window.localStorage.getItem(`${storageKey}:locale`);
  return stored === "en" || stored === "zh-CN" ? stored : resolveBrowserLocale();
}
