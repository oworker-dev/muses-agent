"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, ArrowDownIcon, CheckCircle2Icon, RotateCcwIcon, SparklesIcon } from "lucide-react";
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
import { formatTokenCount, summarizeUsage } from "./usage.js";
export function AgentThreadView({ client, locale, models, onChange, onEvent, reasoningLevels, thread, }) {
    const preferencesRef = useRef(thread.preferences);
    const cancellationRef = useRef({ requested: false });
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
    useEffect(() => {
        onChange({
            events: agent.events,
            session: agent.session,
            status: turnError ? "error" : agent.status,
            updatedAt: Date.now(),
        });
    }, [agent.events, agent.session, agent.status, onChange, turnError]);
    const isBusy = agent.status === "submitted" || agent.status === "streaming";
    const errorMessage = cancellationError ?? turnError ?? agent.error?.message;
    const usage = summarizeUsage(agent.events);
    const prepareTurn = () => {
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
        if ((text.length === 0 && message.files.length === 0) || isBusy)
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
    return (_jsx(PromptInputProvider, { children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [errorMessage ? (_jsx("div", { className: "mx-auto w-full max-w-4xl shrink-0 px-4 pt-3 sm:px-8", children: _jsxs("div", { className: "flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm sm:flex-row", children: [_jsx(AlertCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium", children: messages.requestFailed }), _jsx("p", { className: "mt-0.5 break-words text-muted-foreground", children: errorMessage })] }), _jsxs(Button, { className: "shrink-0", onClick: () => void submit({ files: [], text: messages.retryPrompt }), size: "sm", variant: "outline", children: [_jsx(RotateCcwIcon, { className: "size-4" }), messages.retry] })] }) })) : null, isEmpty ? (_jsx(EmptyThread, { messages: messages, onPrompt: (prompt) => void submit({ files: [], text: prompt }) })) : (_jsxs(Conversation, { className: "min-h-0 flex-1", children: [_jsxs(ConversationContent, { className: "mx-auto w-full max-w-4xl gap-8 px-4 py-8 sm:px-8", children: [agent.data.messages.map((message, index) => (_jsx(AgentMessage, { canRespond: !isBusy, isStreaming: agent.status === "streaming" && index === agent.data.messages.length - 1, locale: locale, message: message, onInputResponses: respond }, message.id))), agent.status === "ready" && latestTurnOutcome(agent.events) === "completed" ? (_jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs", children: [_jsx(CheckCircle2Icon, { className: "size-3.5 text-emerald-600" }), _jsxs("span", { children: [usage.steps, " ", usage.steps === 1 ? messages.step : messages.steps, " \u00B7 ", formatRunDuration(agent.events)] }), _jsxs("span", { children: [messages.inputTokens, " ", formatTokenCount(usage.inputTokens), " \u00B7 ", messages.outputTokens, " ", formatTokenCount(usage.outputTokens), usage.cacheReadTokens > 0 ? ` · Cache ${formatTokenCount(usage.cacheReadTokens)}` : "", usage.costUsd > 0 ? ` · $${usage.costUsd.toFixed(4)}` : ""] })] })) : null] }), _jsx(ConversationScrollButton, { children: _jsx(ArrowDownIcon, { className: "size-4" }) })] })), _jsxs("div", { className: cn("mx-auto w-full shrink-0 px-4 pb-4 sm:px-8", isEmpty ? "max-w-2xl pb-[10vh]" : "max-w-4xl"), children: [_jsx(AgentComposer, { messages: messages, models: models, onPreferencesChange: (preferences) => onChange({ preferences }), onStop: requestCancellation, onSubmit: submit, preferences: thread.preferences, reasoningLevels: reasoningLevels, status: isBusy && cancellationState !== "idle" ? "submitted" : errorMessage ? "error" : agent.status, usage: usage }), _jsx("div", { className: "mt-2 text-center text-xs text-muted-foreground/70", children: formatFooter(agent.status, locale) })] })] }) }));
}
function EmptyThread({ messages, onPrompt }) {
    const suggestions = [
        messages.suggestionInspect,
        messages.suggestionImplement,
        messages.suggestionResearch,
        messages.suggestionReview,
    ];
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-8 text-center", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "mx-auto flex size-10 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm", children: _jsx(SparklesIcon, { className: "size-5" }) }), _jsx("h1", { className: "text-3xl font-medium text-foreground sm:text-4xl", children: messages.emptyTitle })] }), _jsx("div", { className: "grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2", children: suggestions.map((suggestion) => (_jsx(Button, { className: "h-auto justify-start whitespace-normal px-4 py-3 text-left text-sm", onClick: () => onPrompt(suggestion), variant: "outline", children: suggestion }, suggestion))) })] }));
}
function formatFooter(status, locale) {
    if (status === "streaming" || status === "submitted")
        return locale === "zh-CN" ? "Agent 正在工作" : "Agent is working";
    if (status === "error")
        return locale === "zh-CN" ? "可以继续当前任务" : "You can continue this task";
    return locale === "zh-CN" ? "Agent 会根据当前权限执行操作" : "The agent acts within the permissions of this session";
}
function formatRunDuration(events) {
    const completedIndex = events.findLastIndex((event) => event.type === "turn.completed");
    if (completedIndex < 0)
        return "";
    const end = events[completedIndex]?.meta?.at;
    const start = events.slice(0, completedIndex).findLast((event) => event.type === "turn.started")?.meta?.at;
    if (!start || !end)
        return "";
    const durationMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return `${(durationMs / 1000).toFixed(1)}s`;
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