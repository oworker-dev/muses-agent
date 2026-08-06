"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, unstable_useMentionAdapter, useAui, useAuiState, } from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";
import { ArrowDownIcon, ArrowUpIcon, AtSignIcon, CheckIcon, CopyIcon, LoaderCircleIcon, PencilIcon, SlashIcon, SquareIcon, WrenchIcon, } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { ComposerTriggerPopover } from "../assistant-ui/composer-trigger-popover.js";
import { ContextDisplay } from "../assistant-ui/context-display.js";
import { DirectiveText } from "../assistant-ui/directive-text.js";
import { MarkdownText } from "../assistant-ui/markdown-text.js";
import { ModelSelector } from "../assistant-ui/model-selector.js";
import { ToolFallback } from "../assistant-ui/tool-fallback.js";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button.js";
import { Button } from "../ui/button.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentMessage } from "./agent-message.js";
export function AssistantThreadSurface({ cancellationState, commands, events, eveMessages, fallbackStartedAt, isBusy, locale, mentions, messages, models, onInputResponses, onOpenSubagent, onPreferencesChange, pendingTurnText, preferences, quietActivity, reasoningLevels, usage, }) {
    const eveMessagesById = useMemo(() => new Map(eveMessages.map((message) => [message.id, message])), [eveMessages]);
    const lastMessageId = eveMessages.at(-1)?.id;
    return (_jsx(ThreadPrimitive.Root, { className: "aui-root flex h-full min-h-0 flex-col bg-background", style: { "--thread-max-width": "48rem" }, children: _jsxs(ThreadPrimitive.Viewport, { "aria-live": "polite", autoScroll: true, turnAnchor: "top", className: "relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pt-4", role: "log", children: [_jsxs("div", { className: "mx-auto mb-14 flex w-full max-w-(--thread-max-width) flex-col gap-6 empty:hidden", children: [_jsx(ThreadPrimitive.Messages, { children: ({ message }) => message.composer.isEditing ? (_jsx(EditMessage, { messages: messages })) : message.role === "user" ? (_jsx(UserMessage, { messages: messages })) : (_jsx(AssistantMessage, { canRespond: !isBusy, events: events, fallbackStartedAt: fallbackStartedAt, isStreaming: isBusy && message.id === lastMessageId, locale: locale, message: eveMessagesById.get(message.id), messages: messages, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent })) }), pendingTurnText ? _jsx(PendingUserTurn, { text: pendingTurnText }) : null, isBusy ? (_jsx(AgentActivity, { events: events, messages: messages, quietUntilSlow: quietActivity })) : null] }), _jsx(ThreadPrimitive.Empty, { children: !pendingTurnText && !isBusy ? _jsx(AssistantEmptyState, { messages: messages }) : null }), _jsxs(ThreadPrimitive.ViewportFooter, { className: "sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col bg-background pb-4 pt-5 md:pb-6", children: [_jsx(ThreadPrimitive.ScrollToBottom, { asChild: true, children: _jsx(TooltipIconButton, { tooltip: locale === "zh-CN" ? "滚动到底部" : "Scroll to bottom", className: "absolute -top-9 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full disabled:invisible", variant: "outline", children: _jsx(ArrowDownIcon, { className: "size-4" }) }) }), _jsx(AssistantComposer, { cancellationState: cancellationState, commands: commands, locale: locale, mentions: mentions, messages: messages, models: models, onPreferencesChange: onPreferencesChange, preferences: preferences, reasoningLevels: reasoningLevels, usage: usage })] })] }) }));
}
function UserMessage({ messages }) {
    const isLastUserMessage = useAuiState((state) => {
        const lastUser = [...state.thread.messages].reverse().find((message) => message.role === "user");
        return lastUser?.id === state.message.id;
    });
    return (_jsxs(MessagePrimitive.Root, { className: "group mx-auto flex w-full max-w-(--thread-max-width) flex-col items-end", children: [_jsx("div", { className: "max-w-[min(44rem,88%)] rounded-2xl bg-muted/75 px-4 py-3 text-[15px] leading-6 text-foreground", children: _jsx(MessagePrimitive.Parts, { components: { Text: DirectiveText } }) }), isLastUserMessage ? (_jsx(ActionBarPrimitive.Root, { autohide: "always", className: "mt-0.5 flex min-h-7 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100", children: _jsx(ActionBarPrimitive.Edit, { "aria-label": messages.editMessage, className: "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: _jsx(PencilIcon, { className: "size-3.5" }) }) })) : null] }));
}
function AssistantMessage({ canRespond, events, fallbackStartedAt, isStreaming, locale, message, messages, onInputResponses, onOpenSubagent, }) {
    return (_jsxs(MessagePrimitive.Root, { className: "group mx-auto flex w-full max-w-(--thread-max-width) flex-col", children: [_jsx("div", { className: "min-w-0 px-1 text-[15px] leading-7 text-foreground", children: message ? (_jsx(AgentMessage, { canRespond: canRespond, events: events, fallbackStartedAt: fallbackStartedAt, isStreaming: isStreaming, locale: locale, message: message, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, showCopyAction: false })) : (_jsx(MessagePrimitive.Parts, { components: { Text: MarkdownText, tools: { Fallback: ToolFallback } } })) }), _jsx(ActionBarPrimitive.Root, { autohide: "not-last", autohideFloat: "single-branch", className: "ml-0.5 flex min-h-7 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100", children: _jsx(ActionBarPrimitive.Copy, { "aria-label": messages.copyResponse, className: "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: _jsx(CopyIcon, { className: "size-3.5" }) }) })] }));
}
function PendingUserTurn({ text }) {
    return (_jsx("div", { className: "flex w-full justify-end", "data-optimistic": "true", children: _jsx("div", { className: "max-w-[min(44rem,88%)] rounded-2xl bg-muted/75 px-4 py-3 text-[15px] leading-6 text-foreground", children: _jsx("p", { className: "whitespace-pre-wrap break-words", children: text }) }) }));
}
function EditMessage({ messages }) {
    return (_jsx(MessagePrimitive.Root, { className: "mx-auto w-full max-w-(--thread-max-width)", children: _jsxs(ComposerPrimitive.Root, { className: "rounded-2xl bg-muted/75 px-4 py-3", children: [_jsx(ComposerPrimitive.Input, { autoFocus: true, className: "min-h-16 w-full resize-none border-0 bg-transparent text-[15px] leading-6 outline-none" }), _jsxs("div", { className: "mt-2 flex justify-end gap-1.5", children: [_jsx(ComposerPrimitive.Cancel, { asChild: true, children: _jsx(Button, { size: "sm", variant: "ghost", children: messages.cancelEdit }) }), _jsx(ComposerPrimitive.Send, { asChild: true, children: _jsxs(Button, { size: "sm", children: [_jsx(CheckIcon, { className: "size-3.5" }), messages.saveAndResend] }) })] })] }) }));
}
export function AssistantComposer({ cancellationState, commands, inputDisabled = false, locale, mentions, messages, models, onPreferencesChange, preferences, reasoningLevels, usage, }) {
    const aui = useAui();
    const isRunning = useAuiState((state) => state.thread.isRunning);
    const composerIsEmpty = useAuiState((state) => state.composer.isEmpty);
    const runtimeInputDisabled = useAuiState((state) => state.thread.isDisabled);
    const stopping = cancellationState !== "idle";
    const composerDisabled = inputDisabled || runtimeInputDisabled || stopping;
    const composerInputRef = useRef(null);
    useEffect(() => {
        const input = composerInputRef.current?.querySelector('[role="textbox"]');
        if (!input)
            return;
        input.setAttribute("aria-label", messages.inputPlaceholder);
        input.setAttribute("aria-disabled", String(composerDisabled));
        input.setAttribute("contenteditable", String(!composerDisabled));
    }, [composerDisabled, messages.inputPlaceholder]);
    const mention = unstable_useMentionAdapter({
        fallbackIcon: AtSignIcon,
        includeModelContextTools: false,
        items: mentions.map((sourceItem) => {
            const item = localizePromptMenuItem(sourceItem, locale);
            return {
                description: item.description,
                id: item.value,
                label: item.label,
                type: "context",
            };
        }),
    });
    const command = unstable_useMentionAdapter({
        fallbackIcon: SlashIcon,
        includeModelContextTools: false,
        items: commands.map((sourceItem) => {
            const item = localizePromptMenuItem(sourceItem, locale);
            return {
                description: item.description,
                id: item.value,
                label: item.label,
                type: "command",
            };
        }),
    });
    const model = models.find((candidate) => candidate.id === preferences.modelId) ?? models[0];
    const selectorModels = useMemo(() => models.map((candidate) => ({
        efforts: reasoningLevels.map((level) => ({ id: level, name: formatReasoningLevel(level, locale) })),
        id: candidate.id,
        name: candidate.label,
    })), [models, reasoningLevels]);
    const contextLabels = {
        cachedInput: messages.cacheReadTokens,
        contextUsage: messages.contextUsage,
        input: messages.inputTokens,
        of: messages.tokenUsageOf,
        output: messages.outputTokens,
        reasoning: messages.reasoning,
    };
    const contextUsage = {
        cachedInputTokens: usage.cacheReadTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: 0,
        totalTokens: usage.contextInputTokens,
    };
    return (_jsx(ComposerPrimitive.Unstable_TriggerPopoverRoot, { children: _jsxs(ComposerPrimitive.Root, { className: "relative flex w-full flex-col", onSubmit: (event) => {
                event.preventDefault();
                if (!composerDisabled)
                    aui.composer.send();
            }, children: [_jsxs("div", { className: "flex w-full flex-col gap-2 rounded-2xl border border-border/70 bg-background p-2 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.2)]", children: [_jsx(LexicalComposerInput, { "aria-disabled": composerDisabled, directiveChip: DirectiveChip, placeholder: `${messages.inputPlaceholder}  (@ /)`, ref: composerInputRef, onKeyDown: (event) => {
                                if (event.key !== "Enter" || event.shiftKey || composerDisabled || composerIsEmpty)
                                    return;
                                event.preventDefault();
                                aui.composer.send();
                            }, className: "aui-composer-input relative max-h-40 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-[15px] leading-6 outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_.aui-directive-chip]:inline-flex [&_.aui-directive-chip]:items-center [&_.aui-directive-chip]:gap-1 [&_.aui-directive-chip]:rounded-md [&_.aui-directive-chip]:bg-muted [&_.aui-directive-chip]:px-1.5 [&_.aui-directive-chip]:py-0.5 [&_.aui-directive-chip]:text-[13px] [&_.aui-directive-chip]:font-medium [&_.aui-directive-chip]:text-foreground [&_.aui-directive-chip-icon]:text-muted-foreground [&_.aui-lexical-input]:min-h-6 [&_.aui-lexical-input]:outline-none [&_.aui-lexical-placeholder]:pointer-events-none [&_.aui-lexical-placeholder]:absolute [&_.aui-lexical-placeholder]:inset-x-0 [&_.aui-lexical-placeholder]:top-0 [&_.aui-lexical-placeholder]:truncate [&_.aui-lexical-placeholder]:px-2 [&_.aui-lexical-placeholder]:py-1 [&_.aui-lexical-placeholder]:text-muted-foreground" }), _jsxs("div", { className: "flex min-h-8 items-center gap-1", children: [_jsx(ModelSelector, { align: "start", className: "h-8 max-w-56 rounded-full text-muted-foreground", contentClassName: "w-72", effort: preferences.reasoning, effortLabel: messages.reasoning, models: selectorModels, onEffortChange: (reasoning) => onPreferencesChange({ ...preferences, reasoning }), onValueChange: (modelId) => onPreferencesChange({ ...preferences, modelId }), searchable: models.length > 6, size: "sm", value: model?.id ?? preferences.modelId, variant: "ghost", triggerLabel: messages.model }), _jsxs("span", { className: "ml-auto flex items-center gap-1", children: [model ? (_jsx(ContextDisplay.Ring, { className: "h-8 rounded-full px-1.5", label: messages.context, labels: contextLabels, modelContextWindow: model.contextWindowTokens, side: "top", usage: contextUsage })) : null, stopping || (isRunning && composerIsEmpty) ? (_jsx(ComposerPrimitive.Cancel, { asChild: true, children: _jsx(Button, { "aria-label": cancellationState === "idle" ? messages.cancel : messages.stopping, className: "size-8 rounded-full", disabled: cancellationState !== "idle", size: "icon-sm", type: "button", children: cancellationState === "idle" ? (_jsx(SquareIcon, { className: "size-3.5 fill-current" })) : (_jsx(LoaderCircleIcon, { className: "size-4 animate-spin" })) }) })) : (_jsx(Button, { "aria-label": isRunning ? messages.queueFollowUp : messages.send, className: "size-8 rounded-full", disabled: composerDisabled, onClick: () => aui.composer.send(), size: "icon-sm", type: "button", children: _jsx(ArrowUpIcon, { className: "size-4" }) }))] })] })] }), _jsx(ComposerTriggerPopover, { char: "@", ...mention, emptyItemsLabel: messages.noPromptItems }), _jsx(ComposerTriggerPopover, { char: "/", ...command, emptyItemsLabel: messages.noPromptItems })] }) }));
}
function DirectiveChip({ directiveId, directiveType, label }) {
    const Icon = directiveType === "command" ? SlashIcon : AtSignIcon;
    return (_jsxs("span", { className: "aui-directive-chip", "data-directive-id": directiveId, "data-directive-type": directiveType, children: [_jsx(Icon, { className: "aui-directive-chip-icon size-3" }), _jsx("span", { children: label })] }));
}
function formatReasoningLevel(level, locale) {
    if (locale === "zh-CN") {
        if (level === "low")
            return "低";
        if (level === "medium")
            return "中";
        if (level === "high")
            return "高";
        if (level === "xhigh")
            return "极高";
    }
    if (level === "xhigh")
        return "X high";
    if (level === "medium")
        return "Med";
    return level.charAt(0).toUpperCase() + level.slice(1);
}
function localizePromptMenuItem(item, locale) {
    const translation = item.translations?.[locale];
    if (!translation)
        return item;
    return {
        ...item,
        description: translation.description ?? item.description,
        label: translation.label ?? item.label,
    };
}
function AssistantEmptyState({ messages }) {
    const suggestions = [
        messages.suggestionInspect,
        messages.suggestionImplement,
        messages.suggestionResearch,
        messages.suggestionReview,
    ];
    const aui = useAui();
    return (_jsxs("div", { className: "mx-auto flex min-h-[min(30rem,62vh)] w-full max-w-(--thread-max-width) flex-1 flex-col items-center justify-center gap-6 px-2 pb-8 text-center", children: [_jsx(WrenchIcon, { className: "size-8 text-muted-foreground/60" }), _jsx("h1", { className: "text-2xl font-medium tracking-normal text-foreground", children: messages.emptyTitle }), _jsx("div", { className: "grid w-full grid-cols-1 gap-2 sm:grid-cols-2", children: suggestions.map((suggestion) => (_jsx("button", { className: "min-h-20 rounded-lg border border-border/70 px-3 py-3 text-left text-sm leading-5 transition-colors hover:bg-muted/50", onClick: () => aui.composer.setText(suggestion), type: "button", children: suggestion }, suggestion))) })] }));
}
//# sourceMappingURL=assistant-thread-surface.js.map