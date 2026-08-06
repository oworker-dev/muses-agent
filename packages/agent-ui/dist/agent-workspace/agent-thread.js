"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, ArrowDownIcon, Clock3Icon, HammerIcon, RotateCcwIcon, SearchIcon, ShieldCheckIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton, } from "../ai-elements/conversation.js";
import { PromptInputProvider } from "../ai-elements/prompt-input.js";
import { Queue, QueueItem, QueueItemAction, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList, QueueSection, QueueSectionContent, QueueSectionLabel, QueueSectionTrigger, } from "../ai-elements/queue.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentComposer } from "./agent-composer.js";
import { createAgentSession } from "./agent-client.js";
import { AgentMessage } from "./agent-message.js";
import { messagesFor } from "./i18n.js";
import { appendThreadEvent, titleFromPrompt } from "./thread-storage.js";
import { hasUnresolvedInputRequests, isProxiedInputOnlyMessage, } from "./turn-presentation.js";
import { summarizeUsage } from "./usage.js";
export function AgentThreadView({ client, commands, locale, mailbox, mentions, models, onChange, onEvent, onOpenSubagent, onRecoveryNeeded, providerReady, reasoningLevels, thread, }) {
    const preferencesRef = useRef(thread.preferences);
    const cancellationRef = useRef({ requested: false });
    const recoveryRequestedRef = useRef(false);
    const initialEventCountRef = useRef(thread.events.length);
    const initialStreamIndexRef = useRef(thread.session.streamIndex);
    const compactedEventsRef = useRef(thread.events);
    const processedEventCountRef = useRef(thread.events.length);
    const durableProbeInFlightRef = useRef(false);
    const queuedTurnsRef = useRef(thread.queuedTurns);
    const pendingTurnRef = useRef(thread.pendingTurn);
    const dispatchingQueuedTurnIdRef = useRef(undefined);
    const mailboxEnqueueIdsRef = useRef(new Set());
    const turnAdmissionBusyRef = useRef(false);
    const [cancellationState, setCancellationState] = useState("idle");
    const [cancellationError, setCancellationError] = useState();
    const [queueError, setQueueError] = useState();
    const [turnError, setTurnError] = useState(() => latestTurnFailure(thread.events));
    const messages = messagesFor(locale);
    useEffect(() => {
        preferencesRef.current = thread.preferences;
    }, [thread.preferences]);
    useEffect(() => {
        queuedTurnsRef.current = thread.queuedTurns;
    }, [thread.queuedTurns]);
    useEffect(() => {
        pendingTurnRef.current = thread.pendingTurn;
    }, [thread.pendingTurn]);
    const [session] = useState(() => createAgentSession(client, () => preferencesRef.current, thread.session));
    const cancelTurn = useCallback((turnId) => {
        const cancellation = cancellationRef.current;
        if (!cancellation.requested || cancellation.sentTurnId === turnId)
            return;
        cancellation.sentTurnId = turnId;
        setCancellationState("cancelling");
        void session.cancel({ turnId }).catch((error) => {
            cancellation.requested = false;
            cancellation.sentTurnId = undefined;
            setCancellationError(error instanceof Error ? error.message : "Unable to stop this turn.");
            setCancellationState("idle");
        });
    }, [session]);
    const handleEvent = useCallback((event) => {
        if (event.type === "turn.started") {
            cancellationRef.current.turnId = event.data.turnId;
            cancelTurn(event.data.turnId);
        }
        if (event.type === "message.received") {
            const dispatchedId = dispatchingQueuedTurnIdRef.current;
            if (dispatchedId) {
                const queuedTurns = queuedTurnsRef.current.filter((turn) => turn.id !== dispatchedId);
                queuedTurnsRef.current = queuedTurns;
                dispatchingQueuedTurnIdRef.current = undefined;
                pendingTurnRef.current = undefined;
                onChange({ pendingTurn: undefined, queuedTurns });
            }
            else if (pendingTurnRef.current) {
                pendingTurnRef.current = undefined;
                onChange({ pendingTurn: undefined });
            }
            else {
                const serverTurn = queuedTurnsRef.current.find((turn) => turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId));
                if (serverTurn) {
                    const queuedTurns = queuedTurnsRef.current.filter((turn) => turn.id !== serverTurn.id);
                    queuedTurnsRef.current = queuedTurns;
                    onChange({ pendingTurn: undefined, queuedTurns });
                }
                else {
                    onChange({ pendingTurn: undefined });
                }
            }
        }
        if (event.type === "turn.failed" || event.type === "session.failed") {
            setTurnError(event.data.message);
        }
        if (event.type === "turn.completed" || event.type === "turn.cancelled") {
            setTurnError(undefined);
        }
        onEvent?.(event);
    }, [cancelTurn, onChange, onEvent]);
    const agent = useEveAgent({
        initialEvents: thread.events,
        initialSession: thread.session,
        onEvent: handleEvent,
        onSessionChange: (nextSession) => onChange({ session: nextSession }),
        prepareSend: client?.prepareSend,
        session,
    });
    const stopAgent = agent.stop;
    const isBusy = agent.status === "submitted" || agent.status === "streaming";
    const awaitingInput = hasUnresolvedInputRequests(agent.events);
    useEffect(() => {
        turnAdmissionBusyRef.current = isBusy;
    }, [isBusy]);
    const requestRecovery = useCallback(() => {
        if (recoveryRequestedRef.current)
            return;
        const consumedEvents = Math.max(0, agent.events.length - initialEventCountRef.current);
        const currentSession = {
            ...session.state,
            streamIndex: Math.max(session.state.streamIndex, initialStreamIndexRef.current + consumedEvents),
        };
        if (!currentSession.sessionId)
            return;
        recoveryRequestedRef.current = true;
        onChange({ session: currentSession, status: "streaming", updatedAt: Date.now() });
        stopAgent();
        onRecoveryNeeded();
    }, [agent.events.length, onChange, onRecoveryNeeded, session, stopAgent]);
    useEffect(() => {
        const lastEvent = agent.events.at(-1);
        if (agent.session.sessionId &&
            !isBusy &&
            lastEvent &&
            !isSessionBoundary(lastEvent)) {
            requestRecovery();
        }
    }, [agent.events, agent.session.sessionId, isBusy, requestRecovery]);
    useEffect(() => {
        if (!isBusy || !agent.session.sessionId || recoveryRequestedRef.current)
            return;
        let disposed = false;
        let timer;
        const probe = async () => {
            if (disposed || durableProbeInFlightRef.current || recoveryRequestedRef.current)
                return;
            durableProbeInFlightRef.current = true;
            try {
                const consumedEvents = Math.max(0, agent.events.length - initialEventCountRef.current);
                const cursor = Math.max(session.state.streamIndex, initialStreamIndexRef.current + consumedEvents);
                if (await hasDurableProgressAfter(session, cursor))
                    requestRecovery();
            }
            finally {
                durableProbeInFlightRef.current = false;
            }
            if (!disposed && !recoveryRequestedRef.current) {
                timer = window.setTimeout(probe, DURABLE_PROGRESS_PROBE_INTERVAL_MS);
            }
        };
        timer = window.setTimeout(probe, DURABLE_PROGRESS_PROBE_DELAY_MS);
        return () => {
            disposed = true;
            window.clearTimeout(timer);
        };
    }, [agent.events.length, agent.session.sessionId, isBusy, requestRecovery, session]);
    useEffect(() => {
        const consumedEvents = Math.max(0, agent.events.length - initialEventCountRef.current);
        const streamIndex = Math.max(agent.session.streamIndex, initialStreamIndexRef.current + consumedEvents);
        if (agent.events.length < processedEventCountRef.current) {
            compactedEventsRef.current = agent.events;
        }
        else {
            for (const event of agent.events.slice(processedEventCountRef.current)) {
                compactedEventsRef.current = appendThreadEvent(compactedEventsRef.current, event);
            }
        }
        processedEventCountRef.current = agent.events.length;
        onChange({
            events: compactedEventsRef.current,
            session: { ...agent.session, streamIndex },
            status: turnError ? "error" : awaitingInput ? "waiting" : agent.status,
            updatedAt: Date.now(),
        });
    }, [agent.events, agent.session, agent.status, awaitingInput, onChange, turnError]);
    const errorMessage = cancellationError ?? turnError ?? agent.error?.message;
    const usage = summarizeUsage(agent.events);
    useEffect(() => {
        if (agent.status === "error" &&
            thread.pendingTurn?.state === "submitting") {
            const dispatchedId = dispatchingQueuedTurnIdRef.current;
            if (dispatchedId) {
                const queuedTurns = queuedTurnsRef.current.map((turn) => turn.id === dispatchedId ? { ...turn, state: "delivery-failed" } : turn);
                queuedTurnsRef.current = queuedTurns;
                dispatchingQueuedTurnIdRef.current = undefined;
                onChange({ pendingTurn: undefined, queuedTurns });
            }
            else if (!agent.session.sessionId) {
                onChange({ pendingTurn: { ...thread.pendingTurn, state: "delivery-failed" } });
            }
        }
    }, [agent.session.sessionId, agent.status, onChange, thread.pendingTurn]);
    const prepareTurn = () => {
        recoveryRequestedRef.current = false;
        cancellationRef.current = { requested: false };
        setCancellationError(undefined);
        setCancellationState("idle");
        setTurnError(undefined);
    };
    const updateQueuedTurns = (queuedTurns) => {
        queuedTurnsRef.current = queuedTurns;
        onChange({ queuedTurns, updatedAt: Date.now() });
    };
    const markQueuedTurnForRetry = (turnId) => {
        setQueueError(undefined);
        const turn = queuedTurnsRef.current.find((candidate) => candidate.id === turnId);
        if (!turn)
            return;
        if (turn.delivery === "server" && turn.mailboxItemId && mailbox) {
            void mailbox.retry(turn.mailboxItemId)
                .then(() => updateQueuedTurns(queuedTurnsRef.current.map((candidate) => candidate.id === turnId ? { ...candidate, state: "queued" } : candidate)))
                .catch((error) => setQueueError(error instanceof Error ? error.message : messages.queueDeliveryFailed));
            return;
        }
        updateQueuedTurns(queuedTurnsRef.current.map((candidate) => candidate.id === turnId ? { ...candidate, state: "queued" } : candidate));
    };
    const removeQueuedTurn = (turnId) => {
        if (dispatchingQueuedTurnIdRef.current === turnId)
            return;
        setQueueError(undefined);
        const turn = queuedTurnsRef.current.find((candidate) => candidate.id === turnId);
        if (!turn)
            return;
        if (turn.delivery === "server" && turn.mailboxItemId && mailbox) {
            void mailbox.cancel(turn.mailboxItemId)
                .then(() => updateQueuedTurns(queuedTurnsRef.current.filter((candidate) => candidate.id !== turnId)))
                .catch((error) => setQueueError(error instanceof Error ? error.message : messages.queueDeliveryFailed));
            return;
        }
        updateQueuedTurns(queuedTurnsRef.current.filter((candidate) => candidate.id !== turnId));
    };
    const requestCancellation = () => {
        if (!isBusy || cancellationState !== "idle")
            return;
        cancellationRef.current.requested = true;
        setCancellationState("requested");
        if (cancellationRef.current.turnId)
            cancelTurn(cancellationRef.current.turnId);
    };
    const submit = async (message) => {
        const text = message.text.trim();
        if ((text.length === 0 && message.files.length === 0) || awaitingInput || !providerReady)
            return;
        if (isBusy || turnAdmissionBusyRef.current) {
            if (message.files.length > 0) {
                setQueueError(messages.queueAttachmentsUnsupported);
                return;
            }
            if (queuedTurnsRef.current.length >= MAX_QUEUED_FOLLOW_UPS) {
                setQueueError(messages.queueFull);
                return;
            }
            if (text.length > 0) {
                setQueueError(undefined);
                updateQueuedTurns([
                    ...queuedTurnsRef.current,
                    {
                        ...(mailbox ? { delivery: "server" } : {}),
                        id: createPendingTurnId(),
                        state: "queued",
                        submittedAt: Date.now(),
                        text,
                    },
                ]);
            }
            return;
        }
        turnAdmissionBusyRef.current = true;
        prepareTurn();
        if (text.length > 0) {
            const pendingTurn = {
                id: createPendingTurnId(),
                state: "submitting",
                submittedAt: Date.now(),
                text,
            };
            pendingTurnRef.current = pendingTurn;
            onChange({ pendingTurn });
        }
        if (text.length > 0 && agent.data.messages.length === 0) {
            onChange({ title: titleFromPrompt(text) });
        }
        if (message.files.length === 0) {
            await agent.send({ message: text });
            return;
        }
        const parts = [];
        if (text.length > 0)
            parts.push({ text, type: "text" });
        for (const file of message.files) {
            parts.push({ data: file.url, filename: file.filename, mediaType: file.mediaType, type: "file" });
        }
        await agent.send({ message: parts });
    };
    useEffect(() => {
        if (!mailbox || !agent.session.sessionId)
            return;
        const next = queuedTurnsRef.current.find((turn) => turn.delivery === "server" &&
            turn.state === "queued" &&
            !turn.mailboxItemId &&
            !mailboxEnqueueIdsRef.current.has(turn.id));
        if (!next)
            return;
        mailboxEnqueueIdsRef.current.add(next.id);
        void mailbox.enqueue({
            clientMessageId: next.id,
            message: next.text,
            preferences: preferencesRef.current,
            sessionId: agent.session.sessionId,
        }).then((receipt) => {
            const state = mailboxTurnState(receipt.status);
            if (state === "cancelled") {
                updateQueuedTurns(queuedTurnsRef.current.filter((turn) => turn.id !== next.id));
                return;
            }
            updateQueuedTurns(queuedTurnsRef.current.map((turn) => turn.id === next.id
                ? { ...turn, mailboxItemId: receipt.itemId, state }
                : turn));
        }).catch((error) => {
            setQueueError(error instanceof Error ? error.message : messages.queueDeliveryFailed);
            updateQueuedTurns(queuedTurnsRef.current.map((turn) => turn.id === next.id ? { ...turn, state: "delivery-failed" } : turn));
        }).finally(() => {
            mailboxEnqueueIdsRef.current.delete(next.id);
        });
    }, [agent.session.sessionId, mailbox, messages.queueDeliveryFailed, thread.queuedTurns]);
    useEffect(() => {
        if (!mailbox)
            return;
        const tracked = queuedTurnsRef.current.filter((turn) => turn.delivery === "server" && turn.mailboxItemId && turn.state === "queued");
        if (tracked.length === 0)
            return;
        let disposed = false;
        const poll = async () => {
            const updates = new Map();
            await Promise.all(tracked.map(async (turn) => {
                try {
                    const receipt = await mailbox.inspect(turn.mailboxItemId);
                    const state = mailboxTurnState(receipt.status);
                    updates.set(turn.id, state === "cancelled" ? "remove" : state);
                }
                catch {
                }
            }));
            if (disposed || updates.size === 0)
                return;
            updateQueuedTurns(queuedTurnsRef.current.flatMap((turn) => {
                const state = updates.get(turn.id);
                if (state === "remove")
                    return [];
                return state ? [{ ...turn, state }] : [turn];
            }));
        };
        const timer = window.setInterval(() => void poll(), MAILBOX_STATUS_POLL_MS);
        void poll();
        return () => {
            disposed = true;
            window.clearInterval(timer);
        };
    }, [mailbox, thread.queuedTurns]);
    useEffect(() => {
        if (!mailbox || isBusy || awaitingInput || recoveryRequestedRef.current ||
            !queuedTurnsRef.current.some((turn) => turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId)))
            return;
        requestRecovery();
    }, [awaitingInput, isBusy, mailbox, requestRecovery, thread.queuedTurns]);
    useEffect(() => {
        if (isBusy || awaitingInput || !providerReady ||
            dispatchingQueuedTurnIdRef.current ||
            !agent.session.continuationToken)
            return;
        const next = queuedTurnsRef.current.find((turn) => turn.state === "queued" && turn.delivery !== "server");
        if (!next)
            return;
        dispatchingQueuedTurnIdRef.current = next.id;
        turnAdmissionBusyRef.current = true;
        prepareTurn();
        onChange({
            pendingTurn: {
                id: next.id,
                state: "submitting",
                submittedAt: next.submittedAt,
                text: next.text,
            },
        });
        pendingTurnRef.current = {
            id: next.id,
            state: "submitting",
            submittedAt: next.submittedAt,
            text: next.text,
        };
        void agent.send({ message: next.text }).catch(() => {
            const queuedTurns = queuedTurnsRef.current.map((turn) => turn.id === next.id ? { ...turn, state: "delivery-failed" } : turn);
            queuedTurnsRef.current = queuedTurns;
            dispatchingQueuedTurnIdRef.current = undefined;
            onChange({ pendingTurn: undefined, queuedTurns });
        });
    }, [agent, agent.session.continuationToken, awaitingInput, isBusy, onChange, providerReady, thread.queuedTurns]);
    const respond = (inputResponses) => {
        prepareTurn();
        return agent.send({ inputResponses });
    };
    const showPendingTurn = Boolean(thread.pendingTurn && !hasProjectedUserText(agent.data.messages, thread.pendingTurn.text));
    const visibleMessages = agent.data.messages.filter((message) => !isProxiedInputOnlyMessage(message, agent.events));
    const isEmpty = visibleMessages.length === 0 && !showPendingTurn && !errorMessage;
    const activeTaskIsVisible = (isBusy || awaitingInput) && visibleMessages.some((message) => message.role === "assistant" &&
        message.parts.some((part) => part.type === "dynamic-tool"));
    return (_jsx(PromptInputProvider, { children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [isEmpty ? (_jsx(EmptyThread, { disabled: !providerReady, messages: messages, onPrompt: (prompt) => void submit({ files: [], text: prompt }) })) : (_jsxs(Conversation, { className: "min-h-0 flex-1", children: [_jsxs(ConversationContent, { className: "mx-auto w-full max-w-3xl gap-7 px-4 py-8 sm:px-6 lg:py-10", children: [visibleMessages.map((message, index) => (_jsx(AgentMessage, { canRespond: !isBusy, events: agent.events, fallbackStartedAt: thread.pendingTurn?.submittedAt, isStreaming: agent.status === "streaming" && index === visibleMessages.length - 1, locale: locale, message: message, onInputResponses: respond, onOpenSubagent: onOpenSubagent }, message.id))), showPendingTurn && thread.pendingTurn ? (_jsx(PendingUserTurn, { text: thread.pendingTurn.text })) : null, isBusy ? (_jsx(AgentActivity, { events: agent.events, messages: messages, quietUntilSlow: activeTaskIsVisible })) : null, errorMessage ? (_jsx(TurnError, { message: errorMessage, preserved: Boolean(thread.pendingTurn), messages: messages })) : null] }), _jsx(ConversationScrollButton, { children: _jsx(ArrowDownIcon, { className: "size-4" }) })] })), _jsxs("div", { className: "mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6", children: [awaitingInput ? (_jsx("p", { className: "mb-2 text-center text-sm text-amber-700 dark:text-amber-300", role: "status", children: messages.waitingForApproval })) : null, thread.queuedTurns.length > 0 || queueError ? (_jsx(FollowUpQueue, { error: queueError, messages: messages, onRemove: removeQueuedTurn, onRetry: markQueuedTurnForRetry, turns: thread.queuedTurns })) : null, _jsx(AgentComposer, { commands: commands, disabled: !providerReady || awaitingInput, inputDisabled: awaitingInput, mentions: mentions, messages: messages, models: models, onPreferencesChange: (preferences) => onChange({ preferences }), onStop: requestCancellation, onSubmit: submit, preferences: thread.preferences, reasoningLevels: reasoningLevels, status: isBusy && cancellationState !== "idle" ? "submitted" : errorMessage ? "error" : agent.status, usage: usage })] })] }) }));
}
function PendingUserTurn({ text }) {
    return (_jsx("div", { className: "ml-auto max-w-[85%] rounded-lg bg-muted px-4 py-3 text-[15px] leading-6 text-foreground", children: _jsx("p", { className: "whitespace-pre-wrap break-words", children: text }) }));
}
export function FollowUpQueue({ error, messages, onRemove, onRetry, turns, }) {
    return (_jsxs(Queue, { className: "mb-2 rounded-md shadow-none", children: [_jsxs(QueueSection, { defaultOpen: true, children: [_jsx(QueueSectionTrigger, { children: _jsx(QueueSectionLabel, { count: turns.length, icon: _jsx(Clock3Icon, { className: "size-4" }), label: messages.queuedFollowUps }) }), _jsx(QueueSectionContent, { children: _jsx(QueueList, { children: turns.map((turn) => (_jsxs(QueueItem, { className: "flex-row items-center", children: [_jsx(QueueItemIndicator, { className: turn.state === "delivery-failed" ? "border-destructive bg-destructive/10" : undefined }), _jsx(QueueItemContent, { children: turn.text }), turn.state === "delivery-failed" ? (_jsx("span", { className: "shrink-0 text-xs text-destructive", children: messages.queueDeliveryFailed })) : turn.state === "admission-ambiguous" ? (_jsx("span", { className: "shrink-0 text-xs text-amber-700 dark:text-amber-300", children: messages.queueAdmissionAmbiguous })) : null, _jsxs(QueueItemActions, { children: [turn.state === "delivery-failed" ? (_jsx(QueueItemAction, { "aria-label": messages.retryQueuedMessage, onClick: () => onRetry(turn.id), children: _jsx(RotateCcwIcon, { className: "size-3.5" }) })) : null, turn.state !== "admission-ambiguous" ? (_jsx(QueueItemAction, { "aria-label": messages.removeQueuedMessage, onClick: () => onRemove(turn.id), children: _jsx(XIcon, { className: "size-3.5" }) })) : null] })] }, turn.id))) }) })] }), error ? _jsx("p", { className: "px-2 text-xs text-destructive", role: "alert", children: error }) : null] }));
}
function hasProjectedUserText(messages, text) {
    return messages.some((message) => message.role === "user" && message.parts.some((part) => part.type === "text" && part.text === text));
}
function createPendingTurnId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;
}
function isSessionBoundary(event) {
    return event.type === "session.waiting" || event.type === "session.completed" || event.type === "session.failed";
}
const DURABLE_PROGRESS_PROBE_DELAY_MS = 15_000;
const DURABLE_PROGRESS_PROBE_INTERVAL_MS = 10_000;
const DURABLE_PROGRESS_PROBE_TIMEOUT_MS = 2_500;
const MAX_QUEUED_FOLLOW_UPS = 5;
const MAILBOX_STATUS_POLL_MS = 1_500;
function mailboxTurnState(status) {
    if (status === "failed")
        return "delivery-failed";
    if (status === "submission-ambiguous")
        return "admission-ambiguous";
    if (status === "cancelled")
        return "cancelled";
    return "queued";
}
async function hasDurableProgressAfter(session, startIndex) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DURABLE_PROGRESS_PROBE_TIMEOUT_MS);
    try {
        for await (const _event of session.stream({
            follow: false,
            signal: controller.signal,
            startIndex,
        })) {
            return true;
        }
    }
    catch (error) {
        if (!controller.signal.aborted && !isTransientProbeError(error)) {
            console.warn("Durable Agent progress probe failed", error);
        }
    }
    finally {
        window.clearTimeout(timeout);
    }
    return false;
}
function isTransientProbeError(error) {
    if (error instanceof Error && error.name === "AbortError")
        return true;
    if (error instanceof TypeError)
        return true;
    return error instanceof Error && /fetch|network|socket|stream/i.test(error.message);
}
function EmptyThread({ disabled, messages, onPrompt }) {
    const suggestions = [
        { icon: SearchIcon, text: messages.suggestionInspect },
        { icon: HammerIcon, text: messages.suggestionImplement },
        { icon: SparklesIcon, text: messages.suggestionResearch },
        { icon: ShieldCheckIcon, text: messages.suggestionReview },
    ];
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-6 text-center", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "mx-auto flex size-10 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm", children: _jsx(SparklesIcon, { className: "size-5" }) }), _jsx("h1", { className: "text-3xl font-medium text-foreground", children: messages.emptyTitle })] }), _jsx("div", { className: "grid w-full max-w-3xl grid-cols-1 gap-2 min-[520px]:grid-cols-2 lg:grid-cols-4", children: suggestions.map(({ icon: Icon, text }, index) => (_jsxs(Button, { className: cn("h-24 flex-col items-start justify-between whitespace-normal px-4 py-3 text-left text-sm lg:h-36", index > 1 && "hidden lg:flex"), disabled: disabled, onClick: () => onPrompt(text), variant: "outline", children: [_jsx(Icon, { className: "size-4 text-muted-foreground" }), _jsx("span", { children: text })] }, text))) })] }));
}
function TurnError({ message, messages, preserved }) {
    return (_jsxs("div", { className: "flex items-start gap-3 border-l-2 border-destructive/60 py-1 pl-3 text-sm", role: "alert", children: [_jsx(AlertCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium text-foreground", children: messages.requestFailed }), _jsx("p", { className: "mt-0.5 break-words text-muted-foreground", children: message }), preserved ? _jsx("p", { className: "mt-1 text-muted-foreground", children: messages.requestPreserved }) : null] })] }));
}
function latestTurnOutcome(events) {
    const event = [...events].reverse().find((candidate) => candidate.type === "turn.cancelled" || candidate.type === "turn.completed" || candidate.type === "turn.failed");
    if (event?.type === "turn.cancelled")
        return "cancelled";
    if (event?.type === "turn.completed")
        return "completed";
    if (event?.type === "turn.failed")
        return "failed";
    return undefined;
}
function latestTurnFailure(events) {
    if (latestTurnOutcome(events) !== "failed")
        return undefined;
    const event = [...events].reverse().find((candidate) => candidate.type === "turn.failed" || candidate.type === "step.failed");
    return event?.type === "turn.failed" || event?.type === "step.failed" ? event.data.message : undefined;
}
//# sourceMappingURL=agent-thread.js.map