"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionAddScreenshot, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputFooter, PromptInputHeader, PromptInputSelect, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectTrigger, PromptInputSelectValue, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments, } from "../ai-elements/prompt-input.js";
import { FileIcon, GaugeIcon, PaperclipIcon, XIcon } from "lucide-react";
import { formatTokenCount } from "./usage.js";
export function AgentComposer({ messages, models, onPreferencesChange, onSubmit, onStop, preferences, reasoningLevels, status, usage, }) {
    return (_jsxs(PromptInput, { className: "border-border/80 bg-card/95 shadow-[0_10px_35px_-22px_rgba(0,0,0,0.45)]", maxFileSize: 10 * 1024 * 1024, multiple: true, onSubmit: (message) => onSubmit(message), children: [_jsx(PromptInputHeader, { children: _jsx(ComposerAttachments, { messages: messages }) }), _jsx(PromptInputTextarea, { "aria-label": messages.inputPlaceholder, placeholder: messages.inputPlaceholder }), _jsxs(PromptInputFooter, { className: "min-h-11", children: [_jsxs(PromptInputTools, { children: [_jsxs(PromptInputActionMenu, { children: [_jsx(PromptInputActionMenuTrigger, { "aria-label": messages.addFiles, tooltip: messages.addFiles, children: _jsx(PaperclipIcon, { className: "size-4" }) }), _jsxs(PromptInputActionMenuContent, { children: [_jsx(PromptInputActionAddAttachments, { label: messages.addFiles }), _jsx(PromptInputActionAddScreenshot, { label: messages.takeScreenshot })] })] }), _jsx(ModelSelect, { label: messages.model, models: models, onChange: (modelId) => onPreferencesChange({ ...preferences, modelId }), value: preferences.modelId }), _jsx(ReasoningSelect, { label: messages.reasoning, onChange: (reasoning) => onPreferencesChange({ ...preferences, reasoning }), reasoningLevels: reasoningLevels, value: preferences.reasoning })] }), _jsxs("div", { className: "flex min-w-0 items-center gap-2 pr-1 text-muted-foreground text-xs", children: [_jsxs("span", { className: "flex items-center gap-1", title: formatContextTitle(messages.context, models, preferences.modelId, usage.contextInputTokens), children: [_jsx(GaugeIcon, { className: "size-3.5" }), _jsx("span", { children: formatContextUsage(models, preferences.modelId, usage.contextInputTokens) })] }), _jsx(PromptInputSubmit, { "aria-label": status === "ready" || status === "error" ? messages.send : messages.cancel, onStop: onStop, status: status })] })] })] }));
}
function ComposerAttachments({ messages }) {
    const attachments = usePromptInputAttachments();
    if (attachments.files.length === 0)
        return null;
    return (_jsx("div", { className: "flex max-w-full flex-wrap gap-1.5", children: attachments.files.map((file) => (_jsxs("span", { className: "inline-flex max-w-52 items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs", children: [_jsx(FileIcon, { className: "size-3.5 shrink-0 text-muted-foreground" }), _jsx("span", { className: "truncate", children: file.filename ?? messages.attachment }), _jsx("button", { "aria-label": `${messages.removeAttachment}: ${file.filename ?? messages.attachment}`, className: "rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground", onClick: () => attachments.remove(file.id), type: "button", children: _jsx(XIcon, { className: "size-3" }) })] }, file.id))) }));
}
function ModelSelect({ label, models, onChange, value }) {
    const selected = models.find((option) => option.id === value) ?? models[0];
    return (_jsxs(PromptInputSelect, { onValueChange: (next) => { if (models.some((model) => model.id === next))
            onChange(next); }, value: value, children: [_jsx(PromptInputSelectTrigger, { "aria-label": label, className: "h-8 max-w-36 px-2 text-xs", children: _jsx(PromptInputSelectValue, { children: selected.label }) }), _jsx(PromptInputSelectContent, { align: "start", children: models.map((option) => (_jsx(PromptInputSelectItem, { value: option.id, children: option.label }, option.id))) })] }));
}
function formatContextUsage(models, modelId, inputTokens) {
    const model = models.find((option) => option.id === modelId) ?? models[0];
    return `${formatTokenCount(inputTokens)} / ${formatTokenCount(model.contextWindowTokens)}`;
}
function formatContextTitle(label, models, modelId, inputTokens) {
    const model = models.find((option) => option.id === modelId) ?? models[0];
    const percentage = (inputTokens / model.contextWindowTokens) * 100;
    return `${label}: ${formatTokenCount(inputTokens)} / ${formatTokenCount(model.contextWindowTokens)} (${percentage.toFixed(1)}%)`;
}
function ReasoningSelect({ label, onChange, reasoningLevels, value }) {
    return (_jsxs(PromptInputSelect, { onValueChange: (next) => { if (reasoningLevels.includes(next))
            onChange(next); }, value: value, children: [_jsx(PromptInputSelectTrigger, { "aria-label": label, className: "h-8 max-w-28 px-2 text-xs", children: _jsx(PromptInputSelectValue, { children: value }) }), _jsx(PromptInputSelectContent, { align: "start", children: reasoningLevels.map((level) => (_jsx(PromptInputSelectItem, { value: level, children: level }, level))) })] }));
}
//# sourceMappingURL=agent-composer.js.map