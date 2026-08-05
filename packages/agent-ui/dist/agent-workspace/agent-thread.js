"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, ArrowDownIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton, } from "../ai-elements/conversation.js";
import { PromptInputProvider } from "../ai-elements/prompt-input.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import { AgentComposer } from "./agent-composer.js";
import { createAgentSession } from "./agent-client.js";
import { AgentMessage } from "./agent-message.js";
import { messagesFor } from "./i18n.js";
import { titleFromPrompt } from "./thread-storage.js";
import { summarizeUsage } from "./usage.js";
export function AgentThreadView({ client, commands, locale, mentions, models, onChange, onEvent, onRecoveryNeeded, providerReady, reasoningLevels, thread, }) {
    const preferencesRef = useRef(thread.preferences);
    const cancellationRef = useRef({ requested: false });
    const recoveryRequestedRef = useRef(false);
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
        if (event.type === "step.failed" || event.type === "turn.failed" || event.type === "session.failed") {
            setTurnError(event.data.message);
        }
        if (event.type === "turn.completed" || event.type === "turn.cancelled") {
            setTurnError(undefined);
        }
        onEvent?.(event);
    }, [cancelTurn, onEvent]);
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
    const liveStateRef = useRef({
        busy: isBusy,
        events: agent.events,
        session: agent.session,
    });
    liveStateRef.current = {
        busy: isBusy,
        events: agent.events,
        session: agent.session,
    };
    const requestRecovery = useCallback(() => {
        if (recoveryRequestedRef.current)
            return;
        recoveryRequestedRef.current = true;
        stopAgent();
        onRecoveryNeeded();
    }, [onRecoveryNeeded, stopAgent]);
    useEffect(() => {
        if (!isBusy || !agent.session.sessionId)
            return;
        const controller = new AbortController();
        void (async () => {
            await waitForReconciliation(RECONCILIATION_INTERVAL_MS, controller.signal);
            while (!controller.signal.aborted) {
                const current = liveStateRef.current;
                if (!current.busy || !current.session.sessionId)
                    return;
                const probeController = new AbortController();
                const abortProbe = () => probeController.abort();
                controller.signal.addEventListener("abort", abortProbe, { once: true });
                const timeout = window.setTimeout(abortProbe, RECONCILIATION_TIMEOUT_MS);
                const probe = createAgentSession(client, () => preferencesRef.current, {
                    ...current.session,
                    streamIndex: current.events.length,
                });
                let foundBoundary = false;
                try {
                    for await (const event of probe.stream({
                        follow: false,
                        signal: probeController.signal,
                        startIndex: current.events.length,
                    })) {
                        if (isSessionBoundary(event))
                            foundBoundary = true;
                    }
                }
                catch (error) {
                    if (!probeController.signal.aborted && !isAbortError(error)) {
                        console.warn("Agent session reconciliation failed", error);
                    }
                }
                finally {
                    window.clearTimeout(timeout);
                    controller.signal.removeEventListener("abort", abortProbe);
                }
                if (foundBoundary) {
                    requestRecovery();
                    return;
                }
                await waitForReconciliation(RECONCILIATION_INTERVAL_MS, controller.signal);
            }
        })();
        return () => controller.abort();
    }, [agent.session.sessionId, client, isBusy, requestRecovery]);
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
        onChange({
            events: agent.events,
            session: agent.session,
            status: turnError ? "error" : agent.status,
            updatedAt: Date.now(),
        });
    }, [agent.events, agent.session, agent.status, onChange, turnError]);
    const errorMessage = cancellationError ?? turnError ?? agent.error?.message;
    const usage = summarizeUsage(agent.events);
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
        if ((text.length === 0 && message.files.length === 0) || isBusy || !providerReady)
            return;
        prepareTurn();
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
    const isEmpty = agent.data.messages.length === 0;
    return (_jsx(PromptInputProvider, { children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [errorMessage ? (_jsx("div", { className: "mx-auto w-full max-w-4xl shrink-0 px-4 pt-3 sm:px-8", children: _jsxs("div", { className: "flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm sm:flex-row", children: [_jsx(AlertCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium", children: messages.requestFailed }), _jsx("p", { className: "mt-0.5 break-words text-muted-foreground", children: errorMessage })] }), _jsxs(Button, { className: "shrink-0", onClick: () => void submit({ files: [], text: messages.retryPrompt }), size: "sm", variant: "outline", children: [_jsx(RotateCcwIcon, { className: "size-4" }), messages.retry] })] }) })) : null, isEmpty ? (_jsx(EmptyThread, { disabled: !providerReady, messages: messages, onPrompt: (prompt) => void submit({ files: [], text: prompt }) })) : (_jsxs(Conversation, { className: "min-h-0 flex-1", children: [_jsx(ConversationContent, { className: "mx-auto w-full max-w-4xl gap-8 px-4 py-8 sm:px-8", children: agent.data.messages.map((message, index) => (_jsx(AgentMessage, { canRespond: !isBusy, isStreaming: agent.status === "streaming" && index === agent.data.messages.length - 1, locale: locale, message: message, onInputResponses: respond }, message.id))) }), _jsx(ConversationScrollButton, { children: _jsx(ArrowDownIcon, { className: "size-4" }) })] })), _jsx("div", { className: cn("mx-auto w-full shrink-0 px-4 pb-4 sm:px-8", isEmpty ? "max-w-2xl pb-[10vh]" : "max-w-4xl"), children: _jsx(AgentComposer, { commands: commands, disabled: !providerReady, mentions: mentions, messages: messages, models: models, onPreferencesChange: (preferences) => onChange({ preferences }), onStop: requestCancellation, onSubmit: submit, preferences: thread.preferences, reasoningLevels: reasoningLevels, status: isBusy && cancellationState !== "idle" ? "submitted" : errorMessage ? "error" : agent.status, usage: usage }) })] }) }));
}
const RECONCILIATION_INTERVAL_MS = 2_000;
const RECONCILIATION_TIMEOUT_MS = 10_000;
function isSessionBoundary(event) {
    return event.type === "session.waiting" || event.type === "session.completed" || event.type === "session.failed";
}
function waitForReconciliation(ms, signal) {
    if (signal.aborted)
        return Promise.resolve();
    return new Promise((resolve) => {
        const onAbort = () => {
            window.clearTimeout(timeout);
            resolve();
        };
        const timeout = window.setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}
function isAbortError(error) {
    return error instanceof Error && error.name === "AbortError";
}
function EmptyThread({ disabled, messages, onPrompt }) {
    const suggestions = [
        messages.suggestionInspect,
        messages.suggestionImplement,
        messages.suggestionResearch,
        messages.suggestionReview,
    ];
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-8 text-center", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "mx-auto flex size-10 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm", children: _jsx(SparklesIcon, { className: "size-5" }) }), _jsx("h1", { className: "text-3xl font-medium text-foreground sm:text-4xl", children: messages.emptyTitle })] }), _jsx("div", { className: "grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2", children: suggestions.map((suggestion) => (_jsx(Button, { className: "h-auto justify-start whitespace-normal px-4 py-3 text-left text-sm", disabled: disabled, onClick: () => onPrompt(suggestion), variant: "outline", children: suggestion }, suggestion))) })] }));
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