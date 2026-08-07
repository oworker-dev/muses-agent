"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEveAgent } from "eve/react";
import { convertEveMessages, getEveMessageContent } from "@assistant-ui/eve";
import { AssistantRuntimeProvider, unstable_defaultDirectiveFormatter, useExternalStoreRuntime } from "@assistant-ui/react";
import { AlertCircleIcon, Clock3Icon, HammerIcon, RotateCcwIcon, SearchIcon, ShieldCheckIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { createAgentSession } from "./agent-client.js";
import { AssistantThreadSurface } from "./assistant-thread-surface.js";
import { sanitizeAgentError } from "./error-presentation.js";
import { messagesFor } from "./i18n.js";
import { appendThreadEvent, titleFromPrompt } from "./thread-storage.js";
import { hasUnresolvedInputRequests, isProxiedInputOnlyMessage, } from "./turn-presentation.js";
import { summarizeUsage } from "./usage.js";
export function AgentThreadView({ client, commands, draftStorageKey, isRecovering = false, locale, mailbox, mentions, models, onChange, onEvent, onOpenSubagent, onRecoveryNeeded, providerReady, reasoningLevels, thread, }) {
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
        if (event.type === "session.waiting" &&
            (cancellationRef.current.requested || cancellationRef.current.sentTurnId)) {
            cancellationRef.current = { requested: false };
            setCancellationState("idle");
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
    const agentIsBusy = agent.status === "submitted" || agent.status === "streaming";
    const isBusy = agentIsBusy || isRecovering;
    const admissionBusy = agentIsBusy || isRecovering;
    const awaitingInput = hasUnresolvedInputRequests(agent.events);
    useEffect(() => {
        turnAdmissionBusyRef.current = admissionBusy;
    }, [admissionBusy]);
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
            !isRecovering &&
            !cancellationRef.current.requested &&
            !isBusy &&
            lastEvent &&
            !isSessionBoundary(lastEvent)) {
            requestRecovery();
        }
    }, [agent.events, agent.session.sessionId, isBusy, isRecovering, requestRecovery]);
    useEffect(() => {
        if (isRecovering || !agentIsBusy || !agent.session.sessionId || recoveryRequestedRef.current)
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
    }, [agent.events.length, agent.session.sessionId, agentIsBusy, isRecovering, requestRecovery, session]);
    useEffect(() => {
        if (isRecovering)
            return;
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
    }, [agent.events, agent.session, agent.status, awaitingInput, isRecovering, onChange, turnError]);
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
        setCancellationState("cancelling");
        stopAgent();
        const turnId = cancellationRef.current.turnId;
        void session.cancel(turnId ? { turnId } : undefined).then(() => {
            cancellationRef.current = { requested: false };
            setCancellationState("idle");
            onChange({ status: "ready", updatedAt: Date.now() });
            onRecoveryNeeded();
        }).catch((error) => {
            cancellationRef.current = { requested: false };
            setCancellationError(error instanceof Error ? error.message : "Unable to stop this turn.");
            setCancellationState("idle");
            onRecoveryNeeded();
        });
    };
    const submit = async (message) => {
        const text = expandPromptDirectives(message.text, commands, mentions).trim();
        if ((text.length === 0 && message.files.length === 0) || awaitingInput || !providerReady)
            return;
        if (admissionBusy || turnAdmissionBusyRef.current) {
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
    const visibleMessages = agent.data.messages.filter((message) => !isProxiedInputOnlyMessage(message, agent.events));
    const assistantMessages = convertEveMessages({ ...agent.data, messages: visibleMessages }, {
        error: agent.error,
        isRunning: isBusy,
    });
    const queueAdapter = {
        edit: () => {
            throw new Error("Editing a durable mailbox item is not supported.");
        },
        enqueue: (message) => {
            void submit(promptFromAssistantMessage(getEveMessageContent(message)));
        },
        items: thread.queuedTurns.map((turn) => ({
            id: turn.id,
            parts: [{ text: turn.text, type: "text" }],
            prompt: turn.text,
        })),
        move: () => {
            throw new Error("Reordering durable mailbox items is not supported.");
        },
        remove: removeQueuedTurn,
        steer: (message) => {
            void submit(promptFromAssistantMessage(getEveMessageContent(message)));
        },
        steerItems: [],
    };
    const assistantRuntime = useExternalStoreRuntime({
        adapters: { attachments: browserAttachmentAdapter },
        isDisabled: !providerReady || awaitingInput,
        isRunning: isBusy,
        messages: assistantMessages,
        queue: queueAdapter,
        onCancel: async () => {
            requestCancellation();
        },
        onEdit: async (message) => {
            const content = getEveMessageContent(message);
            const prompt = promptFromAssistantMessage(content);
            if (!prompt.text && prompt.files.length === 0)
                return;
            await session.reset();
            agent.reset();
            onChange({ events: [], pendingTurn: undefined, session: { streamIndex: 0 }, status: "ready", updatedAt: Date.now() });
            await submit(prompt);
        },
        onNew: async (message) => {
            await submit(promptFromAssistantMessage(getEveMessageContent(message)));
        },
        onRespondToToolApproval: async (response) => {
            prepareTurn();
            await agent.send({ inputResponses: [{ optionId: response.optionId, requestId: response.approvalId, text: response.reason }] });
        },
    });
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
        if (!mailbox || admissionBusy || awaitingInput || recoveryRequestedRef.current ||
            !queuedTurnsRef.current.some((turn) => turn.delivery === "server" && turn.state === "queued" && Boolean(turn.mailboxItemId)))
            return;
        requestRecovery();
    }, [admissionBusy, awaitingInput, mailbox, requestRecovery, thread.queuedTurns]);
    useEffect(() => {
        if (admissionBusy || awaitingInput || !providerReady ||
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
    }, [admissionBusy, agent, agent.session.continuationToken, awaitingInput, onChange, providerReady, thread.queuedTurns]);
    const respond = (inputResponses) => {
        prepareTurn();
        return agent.send({ inputResponses });
    };
    const showPendingTurn = Boolean(thread.pendingTurn && !hasProjectedUserText(agent.data.messages, thread.pendingTurn.text));
    const activeTaskIsVisible = (isBusy || awaitingInput) && visibleMessages.some((message) => message.role === "assistant" &&
        message.parts.some((part) => part.type === "dynamic-tool"));
    return (_jsx(AssistantRuntimeProvider, { runtime: assistantRuntime, children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [_jsx(AssistantThreadSurface, { cancellationState: cancellationState, commands: commands, draftStorageKey: draftStorageKey, events: agent.events, eveMessages: visibleMessages, fallbackStartedAt: thread.pendingTurn?.submittedAt, isBusy: isBusy, locale: locale, mentions: mentions, messages: messages, models: models, onInputResponses: respond, onOpenSubagent: onOpenSubagent, onPreferencesChange: (preferences) => onChange({ preferences }), pendingTurnText: showPendingTurn ? thread.pendingTurn?.text : undefined, preferences: thread.preferences, quietActivity: activeTaskIsVisible, reasoningLevels: reasoningLevels, usage: usage }), errorMessage ? _jsx(TurnError, { message: sanitizeAgentError(errorMessage), messages: messages, preserved: Boolean(thread.pendingTurn) }) : null, thread.queuedTurns.length > 0 || queueError ? _jsx(FollowUpQueue, { error: queueError, messages: messages, onRemove: removeQueuedTurn, onRetry: markQueuedTurnForRetry, turns: thread.queuedTurns }) : null] }) }));
}
function expandPromptDirectives(value, commands, mentions) {
    const segments = unstable_defaultDirectiveFormatter.parse(value);
    if (segments.every((segment) => segment.kind === "text"))
        return value;
    const catalogs = new Map([
        ...commands.map((item) => [`command:${item.value}`, item.value]),
        ...mentions.map((item) => [`context:${item.value}`, item.value]),
    ]);
    return segments.map((segment) => {
        if (segment.kind === "text")
            return segment.text;
        return catalogs.get(`${segment.type}:${segment.id}`) ?? segment.label;
    }).join("");
}
export function FollowUpQueue({ error, messages, onRemove, onRetry, turns, }) {
    return (_jsxs("div", { className: "mx-auto mb-2 w-full max-w-3xl overflow-hidden rounded-xl border border-border/70 bg-background text-sm", children: [_jsxs(Collapsible, { defaultOpen: true, children: [_jsx(CollapsibleTrigger, { asChild: true, children: _jsxs("button", { "aria-label": `${messages.queuedFollowUps} (${turns.length})`, className: "flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-muted-foreground hover:text-foreground", type: "button", children: [_jsx(Clock3Icon, { className: "size-4" }), messages.queuedFollowUps, _jsx("span", { className: "rounded-full bg-muted px-1.5 text-xs", children: turns.length })] }) }), _jsx(CollapsibleContent, { className: "border-t border-border/60", children: _jsx("div", { className: "space-y-1 p-2", children: turns.map((turn) => (_jsxs("div", { className: "flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60", children: [_jsx("span", { className: cn("size-1.5 shrink-0 rounded-full", turn.state === "delivery-failed" ? "bg-destructive" : "bg-amber-500") }), _jsx("span", { className: "min-w-0 flex-1 truncate", children: turn.text }), turn.state === "delivery-failed" ? _jsx("span", { className: "shrink-0 text-xs text-destructive", children: messages.queueDeliveryFailed }) : turn.state === "admission-ambiguous" ? _jsx("span", { className: "shrink-0 text-xs text-amber-700 dark:text-amber-300", children: messages.queueAdmissionAmbiguous }) : null, turn.state === "delivery-failed" ? _jsx(Button, { "aria-label": messages.retryQueuedMessage, className: "size-7", onClick: () => onRetry(turn.id), size: "icon-sm", variant: "ghost", children: _jsx(RotateCcwIcon, { className: "size-3.5" }) }) : null, turn.state !== "admission-ambiguous" ? _jsx(Button, { "aria-label": messages.removeQueuedMessage, className: "size-7", onClick: () => onRemove(turn.id), size: "icon-sm", variant: "ghost", children: _jsx(XIcon, { className: "size-3.5" }) }) : null] }, turn.id))) }) })] }), error ? _jsx("p", { className: "px-2 text-xs text-destructive", role: "alert", children: error }) : null] }));
}
function hasProjectedUserText(messages, text) {
    return messages.some((message) => message.role === "user" && message.parts.some((part) => part.type === "text" && part.text === text));
}
function createPendingTurnId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;
}
function promptFromAssistantMessage(content) {
    if (typeof content === "string")
        return { files: [], text: content };
    const text = content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
    const files = content.filter((part) => part.type === "file").map((part) => ({ filename: part.filename, mediaType: part.mediaType, url: typeof part.data === "string" ? part.data : String(part.data) }));
    return { files, text };
}
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const browserAttachmentAdapter = {
    accept: "*",
    async add({ file }) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
            throw new Error("Attachments must be 20 MB or smaller.");
        }
        return {
            contentType: file.type || "application/octet-stream",
            file,
            id: typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `attachment-${Date.now()}`,
            name: file.name,
            status: { reason: "composer-send", type: "requires-action" },
            type: file.type.startsWith("image/") ? "image" : "file",
        };
    },
    async remove() {
    },
    async send(attachment) {
        const data = await fileToDataUrl(attachment.file);
        return {
            ...attachment,
            content: [{
                    data,
                    filename: attachment.name,
                    mimeType: attachment.contentType || "application/octet-stream",
                    type: "file",
                }],
            status: { type: "complete" },
        };
    },
};
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read the attachment."));
        reader.readAsDataURL(file);
    });
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