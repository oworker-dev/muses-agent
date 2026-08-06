"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AtSignIcon, CheckIcon, ChevronDownIcon, CommandIcon, FileIcon, PaperclipIcon, SendIcon, SquareIcon, XIcon, } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import { filterPromptMenuItems, findPromptTrigger, replacePromptTrigger } from "./prompt-menu.js";
import { formatTokenCount } from "./usage.js";
export function AgentComposer({ commands = [], disabled = false, inputDisabled = false, mentions = [], messages, models, onPreferencesChange, onSubmit, onStop, preferences, reasoningLevels, status, usage, }) {
    const [text, setText] = useState("");
    const [files, setFiles] = useState([]);
    const [openMenu, setOpenMenu] = useState();
    const fileInputRef = useRef(null);
    const trigger = findPromptTrigger(text);
    const sourceItems = trigger?.kind === "command" ? commands : mentions;
    const items = useMemo(() => trigger ? filterPromptMenuItems(sourceItems, trigger.query) : [], [sourceItems, trigger]);
    const isRunning = status === "streaming" || status === "submitted";
    const selectedModel = models.find((model) => model.id === preferences.modelId) ?? models[0];
    const submit = async () => {
        const message = { files, text: text.trim() };
        if ((!message.text && files.length === 0) || disabled || inputDisabled)
            return;
        setText("");
        setFiles([]);
        await onSubmit(message);
    };
    return (_jsxs("form", { className: "relative rounded-2xl border border-border/80 bg-background px-3 py-2 shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] transition-colors focus-within:border-border", onSubmit: (event) => { event.preventDefault(); void submit(); }, children: [files.length > 0 ? (_jsx("div", { className: "mb-2 flex flex-wrap gap-1.5", children: files.map((file, index) => (_jsxs("span", { className: "inline-flex max-w-52 items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs", children: [_jsx(FileIcon, { className: "size-3.5 shrink-0 text-muted-foreground" }), _jsx("span", { className: "truncate", children: file.filename ?? messages.attachment }), _jsx("button", { "aria-label": `${messages.removeAttachment}: ${file.filename ?? messages.attachment}`, className: "text-muted-foreground hover:text-foreground", onClick: () => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)), type: "button", children: _jsx(XIcon, { className: "size-3" }) })] }, `${file.filename ?? "file"}-${index}`))) })) : null, trigger && items.length > 0 ? (_jsxs("div", { className: "absolute inset-x-2 bottom-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl", children: [_jsx("p", { className: "px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", children: trigger.kind === "command" ? messages.skillsAndCommands : messages.contextItems }), items.map((item) => (_jsxs("button", { className: "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent", onClick: () => setText(replacePromptTrigger(text, trigger, item.value)), type: "button", children: [trigger.kind === "command" ? _jsx(CommandIcon, { className: "size-4 text-muted-foreground" }) : _jsx(AtSignIcon, { className: "size-4 text-muted-foreground" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate font-medium", children: item.label }), item.description ? _jsx("span", { className: "block truncate text-xs text-muted-foreground", children: item.description }) : null] }), _jsx("span", { className: "font-mono text-xs text-muted-foreground", children: item.value })] }, item.id)))] })) : null, _jsx("textarea", { "aria-label": messages.inputPlaceholder, className: "min-h-14 max-h-40 w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-6 outline-none placeholder:text-muted-foreground", disabled: disabled || inputDisabled, onChange: (event) => setText(event.target.value), onKeyDown: (event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                    }
                }, placeholder: messages.inputPlaceholder, value: text }), _jsxs("div", { className: "flex min-h-8 items-center gap-1", children: [_jsx("input", { accept: "image/*,.pdf,.txt,.md,.json,.csv", className: "hidden", multiple: true, onChange: (event) => {
                            const next = Array.from(event.target.files ?? []).map((file) => ({ filename: file.name, mediaType: file.type || "application/octet-stream", url: URL.createObjectURL(file) }));
                            setFiles((current) => [...current, ...next]);
                            event.currentTarget.value = "";
                        }, ref: fileInputRef, type: "file" }), _jsx(Button, { "aria-label": messages.addFiles, className: "size-8 rounded-full", onClick: () => fileInputRef.current?.click(), size: "icon-sm", type: "button", variant: "ghost", children: _jsx(PaperclipIcon, { className: "size-4" }) }), _jsx(MenuSelect, { label: messages.executionMode, options: ["standard", "automation", "cautious"].map((value) => ({ id: value, label: executionLabel(messages, value) })), onChange: (id) => onPreferencesChange({ ...preferences, executionMode: id }), onOpenChange: () => setOpenMenu(openMenu === "execution" ? undefined : "execution"), open: openMenu === "execution", value: preferences.executionMode ?? "standard" }), _jsxs("span", { className: "ml-auto flex items-center gap-0.5", children: [_jsx(MenuSelect, { label: messages.model, options: models.map((model) => ({ id: model.id, label: model.label })), onChange: (id) => onPreferencesChange({ ...preferences, modelId: id }), onOpenChange: () => setOpenMenu(openMenu === "model" ? undefined : "model"), open: openMenu === "model", value: selectedModel?.id ?? preferences.modelId }), _jsx(MenuSelect, { label: messages.reasoning, options: reasoningLevels.map((level) => ({ id: level, label: level })), onChange: (id) => onPreferencesChange({ ...preferences, reasoning: id }), onOpenChange: () => setOpenMenu(openMenu === "reasoning" ? undefined : "reasoning"), open: openMenu === "reasoning", value: preferences.reasoning }), _jsx(ContextUsage, { model: selectedModel, messages: messages, usage: usage }), isRunning ? (_jsxs(_Fragment, { children: [_jsx(Button, { "aria-label": messages.queueFollowUp, className: cn("size-8 rounded-full", text.trim() ? "bg-foreground text-background hover:bg-foreground/90" : ""), disabled: disabled || inputDisabled || !text.trim(), size: "icon-sm", type: "submit", variant: text.trim() ? "default" : "ghost", children: _jsx(SendIcon, { className: "size-4" }) }), _jsx(Button, { "aria-label": messages.cancel, className: "size-8 rounded-full", onClick: onStop, size: "icon-sm", type: "button", variant: "ghost", children: _jsx(SquareIcon, { className: "size-3.5 fill-current" }) })] })) : _jsx(Button, { "aria-label": messages.send, className: cn("size-8 rounded-full", text.trim() || files.length > 0 ? "bg-foreground text-background hover:bg-foreground/90" : ""), disabled: disabled || inputDisabled, size: "icon-sm", type: "submit", variant: text.trim() || files.length > 0 ? "default" : "ghost", children: _jsx(SendIcon, { className: "size-4" }) })] })] })] }));
}
function MenuSelect({ label, options, onChange, onOpenChange, open, value }) {
    const selected = options.find((option) => option.id === value) ?? options[0];
    return (_jsxs("div", { className: "relative", children: [_jsxs(Button, { "aria-label": label, className: "h-8 max-w-32 gap-1 rounded-full px-2 text-xs", onClick: onOpenChange, size: "sm", type: "button", variant: "ghost", children: [_jsx("span", { className: "max-w-24 truncate", children: selected?.label ?? value }), _jsx(ChevronDownIcon, { className: "size-3.5 shrink-0 text-muted-foreground" })] }), open ? _jsx("div", { className: "absolute bottom-[calc(100%+0.5rem)] right-0 z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl", children: options.map((option) => _jsxs("button", { className: cn("flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent", option.id === value && "bg-accent"), onClick: () => { onChange(option.id); onOpenChange(); }, type: "button", children: [_jsx("span", { className: "truncate", children: option.label }), option.id === value ? _jsx(CheckIcon, { className: "size-3.5" }) : null] }, option.id)) }) : null] }));
}
function ContextUsage({ model, messages, usage }) {
    const ratio = model ? Math.min(100, Math.round((usage.contextInputTokens / model.contextWindowTokens) * 100)) : 0;
    return _jsxs("span", { className: "hidden items-center gap-1 px-2 text-xs text-muted-foreground sm:flex", title: `${messages.contextWindow}: ${formatTokenCount(usage.contextInputTokens)} / ${formatTokenCount(model?.contextWindowTokens ?? 0)}`, children: [_jsx("span", { className: "h-1.5 w-12 overflow-hidden rounded-full bg-muted", children: _jsx("span", { className: "block h-full rounded-full bg-foreground/60", style: { width: `${ratio}%` } }) }), _jsx("span", { className: "tabular-nums", children: formatTokenCount(usage.contextInputTokens) })] });
}
function executionLabel(messages, mode) {
    if (mode === "automation")
        return messages.executionAutomation;
    if (mode === "cautious")
        return messages.executionCautious;
    return messages.executionStandard;
}
export function formatUsage(usage) {
    if (!usage)
        return "";
    return [usage.inputTokens, usage.outputTokens].filter((value) => typeof value === "number").map(formatTokenCount).join(" / ");
}
//# sourceMappingURL=agent-composer.js.map