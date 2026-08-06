"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, ArrowDownIcon, HammerIcon, SearchIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton, } from "../ai-elements/conversation.js";
import { PromptInputProvider } from "../ai-elements/prompt-input.js";
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
export function AgentThreadView({ client, commands, locale, mentions, models, onChange, onEvent, onRecoveryNeeded, providerReady, reasoningLevels, thread, }) {
    const preferencesRef = useRef(thread.preferences);
    const cancellationRef = useRef({ requested: false });
    const recoveryRequestedRef = useRef(false);
    const initialEventCountRef = useRef(thread.events.length);
    const initialStreamIndexRef = useRef(thread.session.streamIndex);
    const compactedEventsRef = useRef(thread.events);
    const processedEventCountRef = useRef(thread.events.length);
    const durableProbeInFlightRef = useRef(false);
    const [cancellationState, setCancellationState] = useState("idle");
    const [cancellationError, setCancellationError] = useState();
    const [turnError, setTurnError] = useState(() => latestTurnFailure(thread.events));
    const messages = messagesFor(locale);
    useEffect(() => {
        preferencesRef.current = thread.preferences;
    }, [thread.preferences]);
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
            onChange({ pendingTurn: undefined });
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
            !agent.session.sessionId &&
            thread.pendingTurn?.state === "submitting") {
            onChange({ pendingTurn: { ...thread.pendingTurn, state: "delivery-failed" } });
        }
    }, [agent.session.sessionId, agent.status, onChange, thread.pendingTurn]);
    const prepareTurn = () => {
        recoveryRequestedRef.current = false;
        cancellationRef.current = { requested: false };
        setCancellationError(undefined);
        setCancellationState("idle");
        setTurnError(undefined);
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
        if ((text.length === 0 && message.files.length === 0) || isBusy || awaitingInput || !providerReady)
            return;
        prepareTurn();
        if (text.length > 0) {
            onChange({
                pendingTurn: {
                    id: createPendingTurnId(),
                    state: "submitting",
                    submittedAt: Date.now(),
                    text,
                },
            });
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
    const respond = (inputResponses) => {
        prepareTurn();
        return agent.send({ inputResponses });
    };
    const showPendingTurn = Boolean(thread.pendingTurn && !hasProjectedUserText(agent.data.messages, thread.pendingTurn.text));
    const visibleMessages = agent.data.messages.filter((message) => !isProxiedInputOnlyMessage(message, agent.events));
    const isEmpty = visibleMessages.length === 0 && !showPendingTurn && !errorMessage;
    const activeTaskIsVisible = (isBusy || awaitingInput) && visibleMessages.some((message) => message.role === "assistant" &&
        message.parts.some((part) => part.type === "dynamic-tool"));
    return (_jsx(PromptInputProvider, { children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [isEmpty ? (_jsx(EmptyThread, { disabled: !providerReady, messages: messages, onPrompt: (prompt) => void submit({ files: [], text: prompt }) })) : (_jsxs(Conversation, { className: "min-h-0 flex-1", children: [_jsxs(ConversationContent, { className: "mx-auto w-full max-w-3xl gap-7 px-4 py-8 sm:px-6 lg:py-10", children: [visibleMessages.map((message, index) => (_jsx(AgentMessage, { canRespond: !isBusy, events: agent.events, fallbackStartedAt: thread.pendingTurn?.submittedAt, isStreaming: agent.status === "streaming" && index === visibleMessages.length - 1, locale: locale, message: message, onInputResponses: respond }, message.id))), showPendingTurn && thread.pendingTurn ? (_jsx(PendingUserTurn, { text: thread.pendingTurn.text })) : null, isBusy ? (_jsx(AgentActivity, { events: agent.events, messages: messages, quietUntilSlow: activeTaskIsVisible })) : null, errorMessage ? (_jsx(TurnError, { message: errorMessage, preserved: Boolean(thread.pendingTurn), messages: messages })) : null] }), _jsx(ConversationScrollButton, { children: _jsx(ArrowDownIcon, { className: "size-4" }) })] })), _jsxs("div", { className: "mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6", children: [awaitingInput ? (_jsx("p", { className: "mb-2 text-center text-sm text-amber-700 dark:text-amber-300", role: "status", children: messages.waitingForApproval })) : null, _jsx(AgentComposer, { commands: commands, disabled: !providerReady || awaitingInput, inputDisabled: isBusy || awaitingInput, mentions: mentions, messages: messages, models: models, onPreferencesChange: (preferences) => onChange({ preferences }), onStop: requestCancellation, onSubmit: submit, preferences: thread.preferences, reasoningLevels: reasoningLevels, status: isBusy && cancellationState !== "idle" ? "submitted" : errorMessage ? "error" : agent.status, usage: usage })] })] }) }));
}
function PendingUserTurn({ text }) {
    return (_jsx("div", { className: "ml-auto max-w-[85%] rounded-lg bg-muted px-4 py-3 text-[15px] leading-6 text-foreground", children: _jsx("p", { className: "whitespace-pre-wrap break-words", children: text }) }));
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