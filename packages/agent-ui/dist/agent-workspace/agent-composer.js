"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AtSignIcon, CheckIcon, ChevronDownIcon, CommandIcon, FileIcon, PaperclipIcon, XIcon, } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Context, ContextContent, ContextContentBody, ContextContentHeader, ContextTrigger, } from "../ai-elements/context.js";
import { ModelSelector, ModelSelectorContent, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorName, ModelSelectorTrigger, } from "../ai-elements/model-selector.js";
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionAddScreenshot, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputCommand, PromptInputCommandEmpty, PromptInputCommandGroup, PromptInputCommandItem, PromptInputCommandList, PromptInputFooter, PromptInputHeader, PromptInputSelect, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectTrigger, PromptInputSelectValue, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments, usePromptInputController, } from "../ai-elements/prompt-input.js";
import { Button } from "../ui/button.js";
import { filterPromptMenuItems, findPromptTrigger, replacePromptTrigger, } from "./prompt-menu.js";
import { formatTokenCount } from "./usage.js";
export function AgentComposer({ commands = [], disabled = false, mentions = [], messages, models, onPreferencesChange, onSubmit, onStop, preferences, reasoningLevels, status, usage, }) {
    const attachments = usePromptInputAttachments();
    const executionMode = preferences.executionMode ?? "standard";
    return (_jsxs(PromptInput, { className: "relative overflow-visible border-border/80 bg-card/95 shadow-[0_12px_38px_-24px_rgba(0,0,0,0.5)]", maxFileSize: 10 * 1024 * 1024, multiple: true, onSubmit: (message) => {
            void onSubmit(message).catch(() => undefined);
        }, children: [attachments.files.length > 0 ? (_jsx(PromptInputHeader, { children: _jsx(ComposerAttachments, { messages: messages }) })) : null, _jsx(ComposerTextarea, { commands: commands, disabled: disabled, mentions: mentions, messages: messages }), _jsxs(PromptInputFooter, { className: "min-h-11 flex-wrap gap-1.5 pr-2", children: [_jsxs(PromptInputTools, { className: "min-w-0 flex-1 flex-wrap gap-0.5", children: [_jsxs(PromptInputActionMenu, { children: [_jsx(PromptInputActionMenuTrigger, { "aria-label": messages.addFiles, tooltip: messages.addFiles, children: _jsx(PaperclipIcon, { className: "size-4" }) }), _jsxs(PromptInputActionMenuContent, { align: "start", side: "top", children: [_jsx(PromptInputActionAddAttachments, { label: messages.addFiles }), _jsx(PromptInputActionAddScreenshot, { label: messages.takeScreenshot })] })] }), _jsx(ModelSelect, { label: messages.model, messages: messages, models: models, onChange: (modelId) => onPreferencesChange({ ...preferences, modelId }), value: preferences.modelId }), _jsx(ReasoningSelect, { label: messages.reasoning, onChange: (reasoning) => onPreferencesChange({ ...preferences, reasoning }), reasoningLevels: reasoningLevels, value: preferences.reasoning }), _jsx(ExecutionModeSelect, { label: messages.executionMode, onChange: (nextMode) => onPreferencesChange({ ...preferences, executionMode: nextMode }), value: executionMode })] }), _jsxs("div", { className: "ml-auto flex shrink-0 items-center gap-1", children: [_jsx(ContextUsage, { messages: messages, models: models, modelId: preferences.modelId, usage: usage }), _jsx(PromptInputSubmit, { "aria-label": status === "ready" || status === "error" ? messages.send : messages.cancel, className: "static size-8", disabled: disabled, onStop: onStop, status: status })] })] })] }));
}
function ComposerTextarea({ commands, disabled, mentions, messages, }) {
    const controller = usePromptInputController();
    const textareaRef = useRef(null);
    const [dismissedInput, setDismissedInput] = useState();
    const trigger = findPromptTrigger(controller.textInput.value);
    const sourceItems = trigger?.kind === "command" ? commands : mentions;
    const items = useMemo(() => trigger ? filterPromptMenuItems(sourceItems, trigger.query) : [], [sourceItems, trigger]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const isOpen = Boolean(trigger && controller.textInput.value !== dismissedInput && sourceItems.length > 0);
    useEffect(() => setSelectedIndex(0), [controller.textInput.value]);
    const choose = (item) => {
        if (!trigger)
            return;
        const next = replacePromptTrigger(controller.textInput.value, trigger, item.value);
        controller.textInput.setInput(next);
        setDismissedInput(next);
        requestAnimationFrame(() => textareaRef.current?.focus());
    };
    return (_jsxs(_Fragment, { children: [isOpen ? (_jsx("div", { className: "absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-md border bg-popover shadow-lg", children: _jsx(PromptInputCommand, { value: items[selectedIndex]?.id ?? "", children: _jsxs(PromptInputCommandList, { className: "max-h-64", children: [_jsx(PromptInputCommandEmpty, { children: messages.noPromptItems }), _jsx(PromptInputCommandGroup, { heading: trigger?.kind === "command" ? messages.skillsAndCommands : messages.contextItems, children: items.map((item, index) => (_jsxs(PromptInputCommandItem, { onMouseEnter: () => setSelectedIndex(index), onSelect: () => choose(item), value: item.id, children: [trigger?.kind === "command" ? _jsx(CommandIcon, { className: "size-4" }) : _jsx(AtSignIcon, { className: "size-4" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate font-medium", children: item.label }), item.description ? _jsx("span", { className: "block truncate text-xs text-muted-foreground", children: item.description }) : null] }), _jsx("span", { className: "shrink-0 font-mono text-xs text-muted-foreground", children: item.value })] }, item.id))) })] }) }) })) : null, _jsx(PromptInputTextarea, { "aria-label": messages.inputPlaceholder, className: "min-h-24 text-[15px] leading-6 sm:min-h-28", disabled: disabled, onKeyDown: (event) => {
                    if (!isOpen)
                        return;
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setSelectedIndex((current) => items.length === 0 ? 0 : (current + 1) % items.length);
                    }
                    else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setSelectedIndex((current) => items.length === 0 ? 0 : (current - 1 + items.length) % items.length);
                    }
                    else if ((event.key === "Enter" || event.key === "Tab") && items[selectedIndex]) {
                        event.preventDefault();
                        choose(items[selectedIndex]);
                    }
                    else if (event.key === "Escape") {
                        event.preventDefault();
                        setDismissedInput(controller.textInput.value);
                    }
                }, placeholder: messages.inputPlaceholder, ref: textareaRef })] }));
}
function ComposerAttachments({ messages }) {
    const attachments = usePromptInputAttachments();
    return (_jsx("div", { className: "flex max-w-full flex-wrap gap-1.5", children: attachments.files.map((file) => (_jsxs("span", { className: "inline-flex max-w-52 items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs", children: [_jsx(FileIcon, { className: "size-3.5 shrink-0 text-muted-foreground" }), _jsx("span", { className: "truncate", children: file.filename ?? messages.attachment }), _jsx("button", { "aria-label": `${messages.removeAttachment}: ${file.filename ?? messages.attachment}`, className: "rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground", onClick: () => attachments.remove(file.id), type: "button", children: _jsx(XIcon, { className: "size-3" }) })] }, file.id))) }));
}
function ModelSelect({ label, messages, models, onChange, value, }) {
    const [open, setOpen] = useState(false);
    const selected = models.find((option) => option.id === value) ?? models[0];
    return (_jsxs(ModelSelector, { onOpenChange: setOpen, open: open, children: [_jsx(ModelSelectorTrigger, { asChild: true, children: _jsxs(Button, { "aria-label": label, className: "h-8 max-w-44 gap-1.5 px-2 text-xs", type: "button", variant: "ghost", children: [_jsx("span", { className: "truncate", children: selected.label }), _jsx(ChevronDownIcon, { className: "size-3.5 shrink-0 text-muted-foreground" })] }) }), _jsxs(ModelSelectorContent, { className: "max-w-[calc(100%-2rem)] sm:max-w-md", title: label, children: [_jsx(ModelSelectorInput, { placeholder: messages.searchModels }), _jsxs(ModelSelectorList, { children: [_jsx(ModelSelectorEmpty, { children: messages.noModels }), _jsx(ModelSelectorGroup, { heading: label, children: models.map((option) => (_jsxs(ModelSelectorItem, { onSelect: () => {
                                        onChange(option.id);
                                        setOpen(false);
                                    }, value: `${option.label} ${option.id}`, children: [_jsx(ModelSelectorName, { children: option.label }), option.id === selected.id ? _jsx(CheckIcon, { className: "size-4" }) : null] }, option.id))) })] })] })] }));
}
function ContextUsage({ messages, models, modelId, usage, }) {
    const model = models.find((option) => option.id === modelId) ?? models[0];
    const languageUsage = {
        inputTokens: usage.inputTokens,
        inputTokenDetails: {
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteTokens: usage.cacheWriteTokens,
            noCacheTokens: Math.max(0, usage.inputTokens - usage.cacheReadTokens),
        },
        outputTokens: usage.outputTokens,
        outputTokenDetails: { reasoningTokens: undefined, textTokens: usage.outputTokens },
        totalTokens: usage.inputTokens + usage.outputTokens,
    };
    return (_jsxs(Context, { maxTokens: model.contextWindowTokens, modelId: modelId, usedTokens: usage.contextInputTokens, usage: languageUsage, children: [_jsx(ContextTrigger, { "aria-label": messages.context, className: "h-8 gap-1 px-1.5" }), _jsxs(ContextContent, { align: "end", side: "top", children: [_jsx(ContextContentHeader, {}), _jsxs(ContextContentBody, { className: "space-y-2", children: [_jsx(UsageRow, { label: messages.inputTokens, value: usage.inputTokens }), _jsx(UsageRow, { label: messages.outputTokens, value: usage.outputTokens }), _jsx(UsageRow, { label: messages.cacheReadTokens, value: usage.cacheReadTokens }), _jsx(UsageRow, { label: messages.cacheWriteTokens, value: usage.cacheWriteTokens }), usage.costUsd > 0 ? _jsxs("div", { className: "flex justify-between gap-4 border-t pt-2 text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: messages.estimatedCost }), _jsxs("span", { children: ["$", usage.costUsd.toFixed(4)] })] }) : null] })] })] }));
}
function UsageRow({ label, value }) {
    return _jsxs("div", { className: "flex justify-between gap-4 text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: label }), _jsx("span", { className: "font-mono", children: formatTokenCount(value) })] });
}
function ReasoningSelect({ label, onChange, reasoningLevels, value }) {
    return (_jsxs(PromptInputSelect, { onValueChange: (next) => { if (reasoningLevels.includes(next))
            onChange(next); }, value: value, children: [_jsx(PromptInputSelectTrigger, { "aria-label": label, className: "h-8 max-w-28 px-2 text-xs", children: _jsx(PromptInputSelectValue, { children: value }) }), _jsx(PromptInputSelectContent, { align: "start", position: "popper", side: "top", children: reasoningLevels.map((level) => (_jsx(PromptInputSelectItem, { value: level, children: level }, level))) })] }));
}
function ExecutionModeSelect({ label, onChange, value }) {
    const labels = {
        automation: "Auto",
        cautious: "Review",
        standard: "Standard",
    };
    return (_jsxs(PromptInputSelect, { onValueChange: (next) => {
            if (next === "automation" || next === "cautious" || next === "standard")
                onChange(next);
        }, value: value, children: [_jsx(PromptInputSelectTrigger, { "aria-label": label, className: "h-8 max-w-24 px-2 text-xs", children: _jsx(PromptInputSelectValue, { children: labels[value] }) }), _jsxs(PromptInputSelectContent, { align: "start", position: "popper", side: "top", children: [_jsx(PromptInputSelectItem, { value: "standard", children: "Standard" }), _jsx(PromptInputSelectItem, { value: "cautious", children: "Review" }), _jsx(PromptInputSelectItem, { value: "automation", children: "Auto" })] })] }));
}
//# sourceMappingURL=agent-composer.js.map