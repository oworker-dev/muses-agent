"use client";

import { ClientError, defaultMessageReducer, type HandleMessageStreamEvent } from "eve/client";
import { AlertCircleIcon, ArrowLeftIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftIcon, RotateCcwIcon, ServerOffIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { createAgentSession } from "./agent-client.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentChildSessionView } from "./agent-child-session.js";
import { AgentComposer, type PromptInputMessage } from "./agent-composer.js";
import { AgentMessage } from "./agent-message.js";
import { AgentSettingsDialog } from "./agent-settings-dialog.js";
import { AgentSidebar } from "./agent-sidebar.js";
import { AgentSubagentMenu } from "./agent-subagent-menu.js";
import { AgentThreadView, FollowUpQueue } from "./agent-thread.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentQueuedTurn, AgentThread, AgentThreadPatch, AgentThreadPreferences, AgentWorkspaceClientConfig, AgentWorkspaceMailbox } from "./contracts.js";
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
  presentSubagentSessions,
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
  readonly onEvent?: (event: HandleMessageStreamEvent) => void;
  readonly onDeleteThread?: (thread: AgentThread) => void | Promise<void>;
  readonly onActiveSubagentChange?: (threadId: string, sessionId?: string) => void;
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
  const threadsRef = useRef<readonly AgentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>();
  const [activeSubagentSessionId, setActiveSubagentSessionId] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set());
  const [recoveryErrors, setRecoveryErrors] = useState<Map<string, string>>(new Map());
  const [recoveryQueueErrors, setRecoveryQueueErrors] = useState<Map<string, string>>(new Map());
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
    threadsRef.current = threads;
  }, [threads]);

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
        storageSaveBlocked.current = true;
        setStorageIssue(true);
        onStorageError?.(error);
        const fallback = createAgentThread(Date.now(), messagesFor(restoredLocale).newTask, stableDefaults);
        setThreads([fallback]);
        setActiveThreadId(fallback.id);
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
    if (activeSubagentSessionId) {
      onActiveSubagentChange?.(activeThreadId, activeSubagentSessionId);
      return;
    }
    onActiveThreadChange?.(activeThreadId);
  }, [activeSubagentSessionId, activeThreadId, isHydrated, onActiveSubagentChange, onActiveThreadChange]);

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
    setThreads((current) => {
      const next = current.map((thread) => thread.id === threadId
        ? { ...thread, ...patch, updatedAt: patch.updatedAt ?? Date.now() }
        : thread);
      threadsRef.current = next;
      return next;
    });
  }, []);

  const replaceQueuedTurn = useCallback((
    threadId: string,
    turnId: string,
    replacement?: AgentQueuedTurn,
  ) => {
    setThreads((current) => {
      const next = current.map((thread) => thread.id !== threadId
        ? thread
        : {
            ...thread,
            queuedTurns: replacement
              ? thread.queuedTurns.map((turn) => turn.id === turnId ? replacement : turn)
              : thread.queuedTurns.filter((turn) => turn.id !== turnId),
            updatedAt: Date.now(),
          });
      threadsRef.current = next;
      return next;
    });
  }, []);

  const createThread = useCallback(() => {
    const thread = createAgentThread(Date.now(), messages.newTask, stableDefaults);
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setActiveSubagentSessionId(undefined);
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
    setRecoveryQueueErrors((current) => withoutMapKey(current, threadId));
    setThreads((current) => {
      const next = current.filter((thread) => thread.id !== threadId);
      if (next.length === 0) {
        const replacement = createAgentThread(Date.now(), messages.newTask, stableDefaults);
        setActiveThreadId(replacement.id);
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
  const queueRecoveryMessage = useCallback(async (
    threadId: string,
    message: PromptInputMessage,
  ) => {
    const text = message.text.trim();
    const thread = threadsRef.current.find((candidate) => candidate.id === threadId);
    if (!mailbox || !thread?.session.sessionId || !text) return;
    if (message.files.length > 0) {
      setRecoveryQueueErrors((current) => new Map(current).set(
        threadId,
        messages.queueAttachmentsUnsupported,
      ));
      return;
    }
    if (thread.queuedTurns.length >= 5) {
      setRecoveryQueueErrors((current) => new Map(current).set(threadId, messages.queueFull));
      return;
    }

    const queuedTurn: AgentQueuedTurn = {
      delivery: "server",
      id: createQueuedTurnId(),
      state: "queued",
      submittedAt: Date.now(),
      text,
    };
    setRecoveryQueueErrors((current) => withoutMapKey(current, threadId));
    updateThread(threadId, { queuedTurns: [...thread.queuedTurns, queuedTurn] });

    try {
      const receipt = await mailbox.enqueue({
        clientMessageId: queuedTurn.id,
        message: queuedTurn.text,
        preferences: thread.preferences,
        sessionId: thread.session.sessionId,
      });
      const state = mailboxQueueState(receipt.status);
      if (state === "cancelled") {
        replaceQueuedTurn(threadId, queuedTurn.id);
        return;
      }
      replaceQueuedTurn(threadId, queuedTurn.id, {
        ...queuedTurn,
        mailboxItemId: receipt.itemId,
        state,
      });
    } catch (error) {
      replaceQueuedTurn(threadId, queuedTurn.id, {
        ...queuedTurn,
        state: "delivery-failed",
      });
      setRecoveryQueueErrors((current) => new Map(current).set(
        threadId,
        error instanceof Error ? error.message : messages.queueDeliveryFailed,
      ));
    }
  }, [mailbox, messages.queueAttachmentsUnsupported, messages.queueDeliveryFailed, messages.queueFull, replaceQueuedTurn, updateThread]);
  const removeRecoveryQueuedTurn = useCallback(async (threadId: string, turnId: string) => {
    const turn = threadsRef.current
      .find((thread) => thread.id === threadId)
      ?.queuedTurns.find((candidate) => candidate.id === turnId);
    if (!turn) return;
    setRecoveryQueueErrors((current) => withoutMapKey(current, threadId));
    try {
      if (mailbox && turn.mailboxItemId) await mailbox.cancel(turn.mailboxItemId);
      replaceQueuedTurn(threadId, turnId);
    } catch (error) {
      setRecoveryQueueErrors((current) => new Map(current).set(
        threadId,
        error instanceof Error ? error.message : messages.queueDeliveryFailed,
      ));
    }
  }, [mailbox, messages.queueDeliveryFailed, replaceQueuedTurn]);
  const retryRecoveryQueuedTurn = useCallback(async (threadId: string, turnId: string) => {
    const thread = threadsRef.current.find((candidate) => candidate.id === threadId);
    const turn = thread?.queuedTurns.find((candidate) => candidate.id === turnId);
    if (!mailbox || !thread?.session.sessionId || !turn || turn.state !== "delivery-failed") return;
    setRecoveryQueueErrors((current) => withoutMapKey(current, threadId));
    replaceQueuedTurn(threadId, turnId, { ...turn, state: "queued" });
    try {
      const receipt = turn.mailboxItemId
        ? await mailbox.retry(turn.mailboxItemId)
        : await mailbox.enqueue({
            clientMessageId: turn.id,
            message: turn.text,
            preferences: thread.preferences,
            sessionId: thread.session.sessionId,
          });
      const state = mailboxQueueState(receipt.status);
      if (state === "cancelled") {
        replaceQueuedTurn(threadId, turnId);
        return;
      }
      replaceQueuedTurn(threadId, turnId, {
        ...turn,
        mailboxItemId: receipt.itemId,
        state,
      });
    } catch (error) {
      replaceQueuedTurn(threadId, turnId, { ...turn, state: "delivery-failed" });
      setRecoveryQueueErrors((current) => new Map(current).set(
        threadId,
        error instanceof Error ? error.message : messages.queueDeliveryFailed,
      ));
    }
  }, [mailbox, messages.queueDeliveryFailed, replaceQueuedTurn]);
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
    let pendingTurn = thread.pendingTurn;
    let queuedTurns = thread.queuedTurns;
    let recoveredContinuationToken = thread.session.continuationToken;
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
            if (event.type === "session.waiting") recoveredContinuationToken = event.data.continuationToken;
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
              recoveredContinuationToken = missingBoundary.type === "session.waiting"
                ? missingBoundary.data.continuationToken
                : session.state.continuationToken;
              await refreshMailboxQueue();
              updateThread(thread.id, {
                events: [...events],
                pendingTurn,
                queuedTurns,
                session: { ...session.state, continuationToken: recoveredContinuationToken, streamIndex: cursor },
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
        ) : activeIsRecovering ? (
          <RecoveryView
            commands={commands}
            error={recoveryErrors.get(activeThread.id)}
            locale={locale}
            mailboxEnabled={Boolean(mailbox)}
            mentions={mentions}
            models={models}
            onRemoveQueuedTurn={(turnId) => void removeRecoveryQueuedTurn(activeThread.id, turnId)}
            onPreferencesChange={(preferences) => updateThread(activeThread.id, { preferences })}
            onRetry={() => setRecoveringIds((current) => new Set(current).add(activeThread.id))}
            onRetryQueuedTurn={(turnId) => void retryRecoveryQueuedTurn(activeThread.id, turnId)}
            onStop={() => void stopRecoveringThread(activeThread)}
            onSubmit={(message) => queueRecoveryMessage(activeThread.id, message)}
            providerReady={runtimeStatus.provider !== "unconfigured"}
            queueError={recoveryQueueErrors.get(activeThread.id)}
            reasoningLevels={reasoningLevels}
            thread={activeThread}
          />
        ) : <AgentThreadView client={client} commands={commands} key={activeThread.id} locale={locale} mailbox={mailbox} mentions={mentions} models={models} onChange={changeActiveThread} onEvent={onEvent} onOpenSubagent={openSubagent} onRecoveryNeeded={recoverActiveThread} providerReady={runtimeStatus.provider !== "unconfigured"} reasoningLevels={reasoningLevels} thread={activeThread} />}
      </section>
      <AgentSettingsDialog extensions={extensions} locale={locale} messages={messages} onLocaleChange={setLocale} onOpenChange={setSettingsOpen} open={settingsOpen} />
    </div>
  );
}

function findSubagentSession(
  events: readonly HandleMessageStreamEvent[],
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

function RecoveryView({
  commands,
  error,
  locale,
  mailboxEnabled,
  mentions,
  models,
  onRemoveQueuedTurn,
  onPreferencesChange,
  onRetry,
  onRetryQueuedTurn,
  onStop,
  onSubmit,
  providerReady,
  queueError,
  reasoningLevels,
  thread,
}: {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly error?: string;
  readonly locale: AgentLocale;
  readonly mailboxEnabled: boolean;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly models: readonly AgentModelOption[];
  readonly onRemoveQueuedTurn: (turnId: string) => void;
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly onRetry: () => void;
  readonly onRetryQueuedTurn: (turnId: string) => void;
  readonly onStop: () => void;
  readonly onSubmit: (message: PromptInputMessage) => Promise<void>;
  readonly providerReady: boolean;
  readonly queueError?: string;
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
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6 lg:py-10">
          {visibleMessages.map((message) => <AgentMessage canRespond={false} events={thread.events} fallbackStartedAt={thread.pendingTurn?.submittedAt} isStreaming locale={locale} message={message} key={message.id} onInputResponses={() => undefined} />)}
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1"><p className="font-medium">{messages.recoveryFailed}</p><p className="mt-0.5 break-words text-muted-foreground">{error}</p></div>
              <Button onClick={onRetry} size="sm" variant="outline"><RotateCcwIcon className="size-4" />{messages.retry}</Button>
            </div>
          ) : <AgentActivity events={thread.events} messages={messages} mode="recovery" />}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6">
          {thread.queuedTurns.length > 0 || queueError ? (
            <FollowUpQueue
              error={queueError}
              messages={messages}
              onRemove={onRemoveQueuedTurn}
              onRetry={onRetryQueuedTurn}
              turns={thread.queuedTurns}
            />
          ) : null}
          <AgentComposer
            commands={commands}
            disabled={!providerReady}
            inputDisabled={!mailboxEnabled}
            mentions={mentions}
            messages={messages}
            models={models}
            onPreferencesChange={onPreferencesChange}
            onStop={onStop}
            onSubmit={onSubmit}
            preferences={thread.preferences}
            reasoningLevels={reasoningLevels}
            status="streaming"
            usage={summarizeUsage(thread.events)}
          />
      </div>
    </main>
  );
}

const RECOVERY_POLL_INTERVAL_MS = 1_500;
const RECOVERY_TAIL_LOOKUP_TIMEOUT_MS = 1_500;

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
  if (thread.queuedTurns.some((turn) =>
    turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId)
  )) return true;
  const lastEvent = thread.events.at(-1);
  return !lastEvent || !isRecoveryBoundary(lastEvent);
}

function createQueuedTurnId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `queued-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mailboxQueueState(
  status: import("./contracts.js").AgentMailboxItemStatus,
): AgentQueuedTurn["state"] | "cancelled" {
  if (status === "failed") return "delivery-failed";
  if (status === "submission-ambiguous") return "admission-ambiguous";
  if (status === "cancelled") return "cancelled";
  return "queued";
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

function loadLocale(storageKey: string): AgentLocale {
  const stored = window.localStorage.getItem(`${storageKey}:locale`);
  return stored === "en" || stored === "zh-CN" ? stored : resolveBrowserLocale();
}
