"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { defaultMessageReducer } from "eve/client";
import { AlertCircleIcon, LanguagesIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { Conversation, ConversationContent } from "../ai-elements/conversation.js";
import { createAgentSession } from "./agent-client.js";
import { AgentMessage } from "./agent-message.js";
import { AgentSettingsDialog } from "./agent-settings-dialog.js";
import { AgentSidebar } from "./agent-sidebar.js";
import { AgentThreadView } from "./agent-thread.js";
import { messagesFor, resolveBrowserLocale } from "./i18n.js";
import { AGENT_THREAD_STORAGE_VERSION, browserThreadStorage, createAgentThread, } from "./thread-storage.js";
const DEFAULT_STORAGE_KEY = "muses-agent:threads:v1";
export function AgentWorkspace({ agentName = "muses-agent", client, defaultPreferences, hostSlots, models, onEvent, onDeleteThread, onStorageError, productName = "Agent", reasoningLevels, storageKey = DEFAULT_STORAGE_KEY, threadStorage = browserThreadStorage, }) {
    validateWorkspaceCatalog(models, reasoningLevels, defaultPreferences);
    const catalogSignature = JSON.stringify({ models, reasoningLevels });
    const stableDefaults = useMemo(() => ({
        modelId: defaultPreferences.modelId,
        reasoning: defaultPreferences.reasoning,
    }), [defaultPreferences.modelId, defaultPreferences.reasoning]);
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState();
    const [isHydrated, setIsHydrated] = useState(false);
    const [recoveringIds, setRecoveringIds] = useState(new Set());
    const [recoveryErrors, setRecoveryErrors] = useState(new Map());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [deletionIssue, setDeletionIssue] = useState(false);
    const [deletingThreadIds, setDeletingThreadIds] = useState(new Set());
    const [storageIssue, setStorageIssue] = useState(false);
    const [locale, setLocale] = useState("en");
    const recoveryStarted = useRef(new Set());
    const recoveryControllers = useRef(new Map());
    const storageSaveQueue = useRef(Promise.resolve());
    const storageSaveBlocked = useRef(false);
    const messages = messagesFor(locale);
    useEffect(() => {
        let cancelled = false;
        const restoredLocale = loadLocale(storageKey);
        void Promise.resolve(threadStorage.load(storageKey))
            .then((collection) => {
            if (cancelled)
                return;
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
            .catch((error) => {
            if (cancelled)
                return;
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
        if (!isHydrated)
            return;
        window.localStorage.setItem(`${storageKey}:locale`, locale);
        document.documentElement.lang = locale;
    }, [isHydrated, locale, storageKey]);
    useEffect(() => {
        if (!isHydrated || storageSaveBlocked.current)
            return;
        const collection = {
            activeThreadId,
            threads,
            version: AGENT_THREAD_STORAGE_VERSION,
        };
        storageSaveQueue.current = storageSaveQueue.current
            .catch(() => undefined)
            .then(async () => {
            await threadStorage.save(storageKey, collection);
            setStorageIssue(false);
        })
            .catch((error) => {
            storageSaveBlocked.current = true;
            setStorageIssue(true);
            onStorageError?.(error);
        });
    }, [activeThreadId, isHydrated, onStorageError, storageKey, threadStorage, threads]);
    const updateThread = useCallback((threadId, patch) => {
        setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : thread));
    }, []);
    const createThread = useCallback(() => {
        const thread = createAgentThread(Date.now(), messages.newTask, stableDefaults);
        setThreads((current) => [thread, ...current]);
        setActiveThreadId(thread.id);
        if (!window.matchMedia("(min-width: 1024px)").matches)
            setSidebarOpen(false);
    }, [messages.newTask, stableDefaults]);
    const deleteThread = useCallback(async (threadId) => {
        const thread = threads.find((item) => item.id === threadId);
        if (!thread || deletingThreadIds.has(threadId))
            return;
        if (thread && onDeleteThread) {
            setDeletingThreadIds((current) => new Set(current).add(threadId));
            try {
                await onDeleteThread(thread);
                setDeletionIssue(false);
            }
            catch (error) {
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
            if (threadId === activeThreadId)
                setActiveThreadId(next[0]?.id);
            return next;
        });
    }, [activeThreadId, deletingThreadIds, messages.newTask, onDeleteThread, onStorageError, stableDefaults, threads]);
    const selectThread = useCallback((threadId) => {
        setActiveThreadId(threadId);
        if (!window.matchMedia("(min-width: 1024px)").matches)
            setSidebarOpen(false);
        const selected = threads.find((thread) => thread.id === threadId);
        if (selected && threadNeedsRecovery(selected)) {
            setRecoveringIds((current) => new Set(current).add(threadId));
        }
    }, [threads]);
    const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
    const changeActiveThread = useCallback((patch) => {
        if (activeThreadId)
            updateThread(activeThreadId, patch);
    }, [activeThreadId, updateThread]);
    const recoverThread = useCallback(async (thread) => {
        if (!thread.session.sessionId || recoveryStarted.current.has(thread.id))
            return;
        recoveryStarted.current.add(thread.id);
        setRecoveryErrors((current) => withoutMapKey(current, thread.id));
        const controller = new AbortController();
        recoveryControllers.current.set(thread.id, controller);
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
                if (!settled && !controller.signal.aborted)
                    await wait(600, controller.signal);
            }
            if (controller.signal.aborted)
                return;
            updateThread(thread.id, { events: [...events], session: session.state, status: statusFromEvents(events) });
        }
        catch (error) {
            if (controller.signal.aborted || isAbortError(error))
                return;
            updateThread(thread.id, { status: "error", updatedAt: Date.now() });
            setRecoveryErrors((current) => new Map(current).set(thread.id, error instanceof Error ? error.message : messages.recoveryFailed));
            console.error("Agent session recovery failed", error);
        }
        finally {
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
        for (const controller of recoveryControllers.current.values())
            controller.abort();
        recoveryControllers.current.clear();
    }, []);
    useEffect(() => {
        if (!isHydrated)
            return;
        for (const thread of threads) {
            if (recoveringIds.has(thread.id))
                void recoverThread(thread);
        }
    }, [isHydrated, recoverThread, recoveringIds, threads]);
    const activeIsRecovering = activeThread
        ? recoveringIds.has(activeThread.id) || recoveryErrors.has(activeThread.id)
        : false;
    const modelLabel = models.find((option) => option.id === activeThread?.preferences.modelId)?.label ?? "Agent";
    if (!isHydrated || !activeThread)
        return _jsx("div", { className: "flex h-dvh items-center justify-center bg-background text-muted-foreground", children: messages.loading });
    return (_jsxs("div", { className: "muses-agent-ui flex h-dvh overflow-hidden bg-background text-foreground", children: [_jsx(AgentSidebar, { activeThreadId: activeThread.id, deletingThreadIds: deletingThreadIds, hostFooter: hostSlots?.sidebarFooter, locale: locale, messages: messages, onClose: () => setSidebarOpen(false), onDelete: deleteThread, onNew: createThread, onSelect: selectThread, onSettings: () => setSettingsOpen(true), open: sidebarOpen, threads: threads }), _jsxs("section", { className: "flex min-w-0 flex-1 flex-col", children: [_jsxs("header", { className: "flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-5", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(Button, { "aria-label": messages.openNavigation, className: "lg:hidden", onClick: () => setSidebarOpen(true), size: "icon-sm", variant: "ghost", children: _jsx(MenuIcon, { className: "size-4" }) }), _jsx(Button, { "aria-label": messages.toggleNavigation, className: "hidden lg:inline-flex", onClick: () => setSidebarOpen((open) => !open), size: "icon-sm", variant: "ghost", children: sidebarOpen ? _jsx(PanelLeftCloseIcon, { className: "size-4" }) : _jsx(PanelLeftIcon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "truncate font-medium text-[15px]", children: activeThread.title }), _jsx("span", { className: "hidden rounded-full border px-2 py-0.5 text-xs text-muted-foreground sm:inline-flex", children: modelLabel })] }), _jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [productName, " \u00B7 ", agentName] })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [hostSlots?.threadHeaderEnd, _jsx(Button, { "aria-label": messages.language, onClick: () => setLocale((current) => current === "en" ? "zh-CN" : "en"), size: "icon-sm", variant: "ghost", children: _jsx(LanguagesIcon, { className: "size-4" }) })] })] }), storageIssue ? (_jsxs("div", { className: "flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm", role: "alert", children: [_jsx(AlertCircleIcon, { className: "size-4 shrink-0 text-destructive" }), _jsx("p", { className: "min-w-0 flex-1 text-foreground", children: messages.storageUnavailable }), _jsxs(Button, { onClick: () => window.location.reload(), size: "sm", variant: "outline", children: [_jsx(RotateCcwIcon, { className: "size-4" }), messages.reload] })] })) : null, deletionIssue ? (_jsxs("div", { className: "flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm", role: "alert", children: [_jsx(AlertCircleIcon, { className: "size-4 shrink-0 text-destructive" }), _jsx("p", { className: "min-w-0 flex-1 text-foreground", children: messages.deleteUnavailable }), _jsx(Button, { onClick: () => setDeletionIssue(false), size: "sm", variant: "outline", children: messages.dismiss })] })) : null, activeIsRecovering ? (_jsx(RecoveryView, { error: recoveryErrors.get(activeThread.id), events: activeThread.events, locale: locale, onRetry: () => setRecoveringIds((current) => new Set(current).add(activeThread.id)) })) : _jsx(AgentThreadView, { client: client, locale: locale, models: models, onChange: changeActiveThread, onEvent: onEvent, reasoningLevels: reasoningLevels, thread: activeThread }, activeThread.id)] }), _jsx(AgentSettingsDialog, { locale: locale, messages: messages, onLocaleChange: setLocale, onOpenChange: setSettingsOpen, open: settingsOpen })] }));
}
function RecoveryView({ error, events, locale, onRetry, }) {
    const reducer = useMemo(() => defaultMessageReducer(), []);
    const data = useMemo(() => events.reduce((current, event) => reducer.reduce(current, event), reducer.initial()), [events, reducer]);
    const messages = messagesFor(locale);
    return (_jsx("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: _jsx(Conversation, { className: "min-h-0 flex-1", children: _jsxs(ConversationContent, { className: "mx-auto w-full max-w-4xl gap-8 px-4 py-8 sm:px-8", children: [data.messages.map((message) => _jsx(AgentMessage, { canRespond: false, isStreaming: true, locale: locale, message: message, onInputResponses: () => undefined }, message.id)), error ? (_jsxs("div", { className: "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm", children: [_jsx(AlertCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium", children: messages.recoveryFailed }), _jsx("p", { className: "mt-0.5 break-words text-muted-foreground", children: error })] }), _jsxs(Button, { onClick: onRetry, size: "sm", variant: "outline", children: [_jsx(RotateCcwIcon, { className: "size-4" }), messages.retry] })] })) : _jsx("div", { className: "text-muted-foreground text-sm", children: messages.reconnecting })] }) }) }));
}
function isRecoveryBoundary(event) {
    return event.type === "session.waiting" || event.type === "session.completed" || event.type === "session.failed";
}
function statusFromEvents(events) {
    const last = events.at(-1);
    if (!last)
        return "ready";
    if (last.type === "session.failed")
        return "error";
    const latestTurnBoundary = [...events].reverse().find((event) => event.type === "turn.completed" || event.type === "turn.failed" || event.type === "turn.cancelled");
    if (latestTurnBoundary?.type === "turn.failed")
        return "error";
    if (last.type === "session.waiting" || last.type === "session.completed")
        return "ready";
    if (last.type === "turn.started" || last.type === "step.started" || last.type === "message.appended" || last.type === "reasoning.appended")
        return "streaming";
    return "submitted";
}
function wait(ms, signal) {
    if (signal.aborted)
        return Promise.resolve();
    return new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
            window.clearTimeout(timeout);
            resolve();
        }, { once: true });
    });
}
function isAbortError(error) {
    return error instanceof Error && error.name === "AbortError";
}
function validateWorkspaceCatalog(models, reasoningLevels, defaults) {
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
function normalizeThreadPreferences(thread, models, reasoningLevels, defaults) {
    const modelId = models.some((model) => model.id === thread.preferences.modelId)
        ? thread.preferences.modelId
        : defaults.modelId;
    const reasoning = reasoningLevels.includes(thread.preferences.reasoning)
        ? thread.preferences.reasoning
        : defaults.reasoning;
    return modelId === thread.preferences.modelId && reasoning === thread.preferences.reasoning
        ? thread
        : { ...thread, preferences: { modelId, reasoning } };
}
function withoutSetValue(source, value) {
    if (!source.has(value))
        return source;
    const next = new Set(source);
    next.delete(value);
    return next;
}
function withoutMapKey(source, key) {
    if (!source.has(key))
        return source;
    const next = new Map(source);
    next.delete(key);
    return next;
}
function threadNeedsRecovery(thread) {
    if (!thread.session.sessionId)
        return false;
    const lastEvent = thread.events.at(-1);
    return !lastEvent || !isRecoveryBoundary(lastEvent);
}
function loadLocale(storageKey) {
    const stored = window.localStorage.getItem(`${storageKey}:locale`);
    return stored === "en" || stored === "zh-CN" ? stored : resolveBrowserLocale();
}
//# sourceMappingURL=agent-workspace.js.map