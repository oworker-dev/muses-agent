"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CheckIcon, CheckCircleIcon, ChevronDownIcon, CirclePauseIcon, CircleStopIcon, CopyIcon, ExternalLinkIcon, FileIcon, ImageIcon, KeyRoundIcon, LoaderCircleIcon, NetworkIcon, XCircleIcon, } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { DiffViewer } from "../ui/diff-viewer.js";
import { cn } from "../utils.js";
import { presentAgentTurn, presentSubagentCall, } from "./turn-presentation.js";
function Message({ children, from, ...props }) {
    return _jsx("article", { className: cn("group flex w-full flex-col", from === "user" ? "items-end" : "items-start"), ...props, children: children });
}
function MessageContent({ children }) {
    return _jsx("div", { className: "min-w-0 max-w-full", children: children });
}
function MessageResponse({ children, isAnimating }) {
    return _jsxs("p", { className: "whitespace-pre-wrap break-words", children: [children, isAnimating ? _jsx("span", { className: "ml-1 inline-block animate-pulse text-muted-foreground", children: "\u258D" }) : null] });
}
function MessageActions({ children, className }) {
    return _jsx("div", { className: cn("mt-1 flex gap-1", className), children: children });
}
function MessageAction({ children, label, onClick, tooltip }) {
    return _jsx(Button, { "aria-label": label, className: "size-7", onClick: onClick, size: "icon-sm", title: tooltip, variant: "ghost", children: children });
}
function Reasoning({ children, defaultOpen, isStreaming }) {
    return _jsxs("details", { className: "my-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground", open: defaultOpen || isStreaming, children: [_jsx("summary", { className: "cursor-pointer select-none font-medium", children: isStreaming ? "Thinking…" : "Reasoning" }), children] });
}
function ReasoningTrigger({ getThinkingMessage }) {
    return _jsx("span", { className: "sr-only", children: getThinkingMessage(false) });
}
function ReasoningContent({ children }) {
    return _jsx("div", { className: "mt-2 whitespace-pre-wrap break-words", children: children });
}
function Shimmer({ children }) {
    return _jsx("span", { className: "animate-pulse", children: children });
}
function Tool({ children, defaultOpen, className }) {
    return _jsx(Collapsible, { className: cn("my-2 border-b border-border/60 py-2", className), defaultOpen: defaultOpen, children: children });
}
function ToolHeader({ title, statusLabel }) {
    return _jsx(CollapsibleTrigger, { asChild: true, children: _jsxs("button", { "aria-label": title, className: "flex w-full cursor-pointer items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground", type: "button", children: [_jsx("span", { className: "font-medium text-foreground", children: title }), _jsx("span", { className: "text-xs", children: statusLabel }), _jsx(ChevronDownIcon, { className: "ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-180" })] }) });
}
function ToolContent({ children }) {
    return _jsx(CollapsibleContent, { children: _jsx("div", { className: "mt-2 space-y-2", children: children }) });
}
function ToolInput({ input, label }) {
    return _jsxs("details", { className: "text-xs", children: [_jsx("summary", { className: "cursor-pointer text-muted-foreground", children: label }), _jsx("pre", { className: "mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2", children: safeStringify(input) })] });
}
function ToolOutput({ output, resultLabel, errorLabel, errorText }) {
    return _jsxs("div", { className: "text-xs", children: [_jsx("span", { className: errorText ? "text-destructive" : "text-muted-foreground", children: errorText ? errorLabel : resultLabel }), _jsx("pre", { className: "mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2", children: errorText ?? safeStringify(output) })] });
}
function safeStringify(value) {
    try {
        return JSON.stringify(value ?? {}, null, 2);
    }
    catch {
        return String(value);
    }
}
export function AgentMessage({ canRespond, events, fallbackStartedAt, isStreaming, locale, message, onOpenSubagent, onInputResponses, showCopyAction = true, }) {
    const task = presentAgentTurn(message, events);
    const lastTextIndex = message.parts.reduce((last, part, index) => (part.type === "text" ? index : last), -1);
    const responseText = task?.finalPart?.text ?? (task ? undefined : lastText(message.parts));
    return (_jsxs(Message, { "data-optimistic": message.metadata?.optimistic ? "true" : undefined, from: message.role, children: [_jsx(MessageContent, { children: task ? (_jsxs(_Fragment, { children: [_jsxs(ExecutionGroup, { fallbackStartedAt: fallbackStartedAt, locale: locale, task: task, children: [task.processParts.map((part, index) => (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: task.status === "running" || task.status === "waiting", locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: false }, partKey(part, index)))), task.proxiedInputParts.map((part) => (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-amber-700 dark:text-amber-300", children: localize(locale, "A delegated task needs your approval", "子代理任务需要你的批准") }), _jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: true, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: false })] }, `proxied-input:${part.toolCallId}`)))] }), task.finalPart ? (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: false, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: task.finalPart, showCaret: isStreaming && task.finalPart.state === "streaming" })) : null] })) : message.parts.map((part, index) => (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: false, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: isStreaming && message.role === "assistant" && index === lastTextIndex }, partKey(part, index)))) }), showCopyAction && message.role === "assistant" && responseText && !isStreaming ? (_jsx(CopyResponseAction, { locale: locale, text: responseText })) : null] }));
}
function AgentMessagePart({ canRespond, events, inActiveExecution, locale, onOpenSubagent, onInputResponses, part, showCaret, }) {
    switch (part.type) {
        case "step-start":
            return null;
        case "text":
            return (_jsx(MessageResponse, { caret: "block", isAnimating: showCaret, children: part.text }));
        case "reasoning":
            return (_jsxs(Reasoning, { defaultOpen: part.state === "streaming", isStreaming: part.state === "streaming", children: [_jsx(ReasoningTrigger, { getThinkingMessage: (streaming, duration) => reasoningLabel(locale, streaming, duration) }), _jsx(ReasoningContent, { children: part.text })] }));
        case "file":
            return _jsx(AttachmentPart, { locale: locale, part: part });
        case "authorization":
            return _jsx(AuthorizationPrompt, { locale: locale, part: part });
        case "dynamic-tool": {
            const patch = toolPatch(part);
            return (_jsxs(Tool, { className: "mb-0", defaultOpen: (inActiveExecution && part.state !== "output-available") || part.state === "approval-requested" || part.state === "approval-responded", children: [_jsx(ToolHeader, { showStatus: part.state !== "output-available", state: part.state, statusLabel: toolStatusLabel(locale, part.state), title: toolTitle(locale, part), toolName: part.toolName, type: "dynamic-tool" }), _jsxs(ToolContent, { children: [patch ? (_jsx("div", { className: "max-h-[28rem] overflow-auto", "data-tool-view": "diff", children: _jsx(DiffViewer, { patch: patch, showIcon: true, size: "sm", variant: "muted" }) })) : (_jsxs(_Fragment, { children: [part.toolMetadata?.eve?.kind === "subagent-call" ? (_jsx(SubagentProgress, { events: events, locale: locale, onOpenSubagent: onOpenSubagent, part: part })) : null, _jsx(ToolInput, { input: part.input, label: localize(locale, "Parameters", "参数") })] })), _jsx(InputRequestActions, { canRespond: canRespond, locale: locale, part: part, onInputResponses: onInputResponses }), patch && !part.errorText ? null : (_jsx(ToolOutput, { errorLabel: localize(locale, "Error", "错误"), errorText: part.errorText, output: part.output, resultLabel: localize(locale, "Result", "结果") }))] })] }));
        }
    }
}
function toolPatch(part) {
    const toolName = part.toolName.toLocaleLowerCase().replaceAll("-", "_");
    if (!["apply_patch", "patch_file"].includes(toolName))
        return undefined;
    return patchFromValue(part.input) ?? patchFromValue(part.output);
}
function patchFromValue(value) {
    if (typeof value === "string")
        return looksLikeUnifiedDiff(value) ? value : undefined;
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const record = value;
    const patch = record.patch ?? record.diff;
    return typeof patch === "string" && looksLikeUnifiedDiff(patch) ? patch : undefined;
}
function looksLikeUnifiedDiff(value) {
    return /^(?:diff --git |--- )/m.test(value) && /^\+\+\+ /m.test(value) && /^@@ /m.test(value);
}
function SubagentProgress({ events, locale, onOpenSubagent, part, }) {
    const presentation = presentSubagentCall(events, part.toolCallId);
    const elapsedSeconds = useElapsedSeconds(presentation.startedAt, presentation.endedAt);
    const isActive = presentation.status === "running" || presentation.status === "starting";
    const title = presentation.status === "completed"
        ? localize(locale, "Sub-agent finished and returned its result to the parent Agent", "子代理已完成，结果已返回父 Agent")
        : presentation.status === "cancelled"
            ? localize(locale, "Sub-agent stopped", "子代理已停止")
            : presentation.status === "failed"
                ? localize(locale, "Sub-agent failed and returned control to the parent Agent", "子代理执行失败，控制权已返回父 Agent")
                : presentation.status === "running" && elapsedSeconds >= 45
                    ? localize(locale, "Sub-agent is still working; the parent Agent will resume automatically", "子代理仍在执行；完成后父 Agent 会自动继续")
                    : presentation.status === "running"
                        ? localize(locale, "Sub-agent is working independently", "子代理正在独立执行")
                        : localize(locale, "Starting the delegated task", "正在启动委派任务");
    return (_jsxs("div", { className: cn("flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm", presentation.status === "failed"
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/30"), role: isActive ? "status" : undefined, children: [isActive ? (_jsx(LoaderCircleIcon, { className: "mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" })) : presentation.status === "completed" ? (_jsx(CheckCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" })) : presentation.status === "cancelled" ? (_jsx(CircleStopIcon, { className: "mt-0.5 size-4 shrink-0 text-muted-foreground" })) : (_jsx(XCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-foreground", children: title }), _jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [_jsx(NetworkIcon, { className: "mr-1 inline size-3" }), presentation.name === "agent"
                                ? localize(locale, "Works in the parent Agent workspace.", "在父 Agent 的工作区中执行。")
                                : localize(locale, "Runs in its own isolated workspace.", "在独立隔离的工作区中执行。")] }), presentation.childSessionId && onOpenSubagent ? (_jsxs(Button, { className: "mt-2 h-7 px-2 text-xs", onClick: () => onOpenSubagent(presentation.childSessionId), size: "sm", variant: "outline", children: [_jsx(NetworkIcon, { className: "size-3.5" }), localize(locale, `Open ${presentation.name === "agent" ? "sub-agent" : presentation.name ?? "sub-agent"} session`, `打开${presentation.name && presentation.name !== "agent" ? ` ${presentation.name}` : "子代理"}会话`)] })) : null] }), presentation.startedAt ? (_jsx("span", { className: "shrink-0 text-xs tabular-nums text-muted-foreground", children: formatDuration(elapsedSeconds) })) : null] }));
}
function ExecutionGroup({ children, fallbackStartedAt, locale, task, }) {
    const isActive = task.status === "running" || task.status === "waiting";
    const [open, setOpen] = useState(isActive);
    const previousStatus = useRef(task.status);
    const startedAt = task.startedAt ?? fallbackStartedAt;
    const elapsedSeconds = useElapsedSeconds(startedAt, task.endedAt);
    useEffect(() => {
        const wasActive = previousStatus.current === "running" || previousStatus.current === "waiting";
        if (task.status === "waiting")
            setOpen(true);
        else if (wasActive && !isActive)
            setOpen(false);
        previousStatus.current = task.status;
    }, [isActive, task.status]);
    return (_jsxs(Collapsible, { className: "group/execution w-full", onOpenChange: setOpen, open: open, children: [_jsx(CollapsibleTrigger, { asChild: true, children: _jsxs("button", { className: "flex w-full items-center gap-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground", type: "button", children: [task.status === "running" ? (_jsx(LoaderCircleIcon, { className: "size-4 shrink-0 animate-spin" })) : task.status === "waiting" ? (_jsx(CirclePauseIcon, { className: "size-4 shrink-0 text-amber-600 dark:text-amber-300" })) : task.status === "completed" ? (_jsx(CheckCircleIcon, { className: "size-4 shrink-0" })) : (_jsx(XCircleIcon, { className: "size-4 shrink-0" })), _jsx("span", { children: executionLabel(locale, task.status) }), startedAt ? _jsx("span", { className: "tabular-nums", children: formatDuration(elapsedSeconds) }) : null, _jsx(ChevronDownIcon, { className: "size-3.5 transition-transform group-data-[state=open]/execution:rotate-180" })] }) }), _jsx(CollapsibleContent, { className: "overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in", children: _jsx("div", { className: "mt-2 space-y-3 border-t border-border/60 pt-3", children: children }) })] }));
}
function CopyResponseAction({ locale, text }) {
    const [copied, setCopied] = useState(false);
    const timeout = useRef(undefined);
    useEffect(() => () => window.clearTimeout(timeout.current), []);
    return (_jsx(MessageActions, { className: "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100", children: _jsx(MessageAction, { label: localize(locale, "Copy response", "复制回复"), onClick: () => {
                void copyText(text).then(() => {
                    setCopied(true);
                    window.clearTimeout(timeout.current);
                    timeout.current = window.setTimeout(() => setCopied(false), 1_500);
                });
            }, tooltip: localize(locale, copied ? "Copied" : "Copy response", copied ? "已复制" : "复制回复"), children: copied ? _jsx(CheckIcon, { className: "size-3.5" }) : _jsx(CopyIcon, { className: "size-3.5" }) }) }));
}
function useElapsedSeconds(startedAt, endedAt) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        if (!startedAt || endedAt)
            return;
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [endedAt, startedAt]);
    if (!startedAt)
        return 0;
    return Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1_000));
}
function executionLabel(locale, status) {
    if (status === "running")
        return localize(locale, "Working", "正在处理");
    if (status === "waiting")
        return localize(locale, "Waiting for approval", "等待批准");
    if (status === "completed")
        return localize(locale, "Worked for", "已处理");
    if (status === "cancelled")
        return localize(locale, "Stopped after", "已停止");
    return localize(locale, "Failed after", "执行失败");
}
function formatDuration(totalSeconds) {
    if (totalSeconds < 60)
        return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
function lastText(parts) {
    const part = [...parts].reverse().find((candidate) => candidate.type === "text");
    return part?.type === "text" ? part.text : undefined;
}
async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied)
        throw new Error("Clipboard access is unavailable.");
}
function AttachmentPart({ locale, part }) {
    const label = part.filename ?? localize(locale, "Attachment", "附件");
    const detail = [part.mediaType, formatBytes(part.size)].filter(Boolean).join(" - ");
    const isImage = part.mediaType.startsWith("image/") && part.url !== undefined;
    const Icon = isImage ? ImageIcon : FileIcon;
    const body = (_jsxs("span", { className: "flex max-w-sm items-center gap-3 rounded-md border bg-background/60 p-2 text-sm", children: [isImage ? (_jsx("img", { alt: label, className: "size-12 shrink-0 rounded-sm object-cover", src: part.url })) : (_jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground", children: _jsx(Icon, { className: "size-4" }) })), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate font-medium", children: label }), detail ? _jsx("span", { className: "block truncate text-muted-foreground", children: detail }) : null] }), part.url ? _jsx(ExternalLinkIcon, { className: "size-4 shrink-0 text-muted-foreground" }) : null] }));
    return part.url ? (_jsx("a", { href: part.url, rel: "noreferrer", target: "_blank", children: body })) : (body);
}
function AuthorizationPrompt({ locale, part }) {
    const isAuthorized = part.state === "completed" && part.outcome === "authorized";
    const isCompleted = part.state === "completed";
    const Icon = isAuthorized ? CheckCircleIcon : isCompleted ? XCircleIcon : KeyRoundIcon;
    const instructions = part.authorization?.instructions;
    const shouldShowInstructions = instructions !== undefined && instructions !== part.description;
    return (_jsx("div", { className: cn("space-y-3 rounded-md border p-3", isAuthorized
            ? "border-emerald-500/30 bg-emerald-500/5"
            : isCompleted
                ? "border-destructive/30 bg-destructive/5"
                : "border-blue-500/30 bg-blue-500/5"), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", isAuthorized
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : isCompleted
                            ? "bg-destructive/10 text-destructive"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-300"), children: _jsx(Icon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsx("p", { className: "font-medium text-sm", children: authorizationTitle(part, locale) }), _jsx("p", { className: "text-muted-foreground text-sm", children: authorizationDescription(part, locale) }), shouldShowInstructions ? (_jsx("p", { className: "text-muted-foreground text-sm", children: instructions })) : null, part.state === "required" && part.authorization?.userCode ? (_jsxs("div", { className: "flex flex-wrap items-center gap-2 text-sm", children: [_jsx("span", { className: "text-muted-foreground", children: localize(locale, "Code", "验证码") }), _jsx("code", { className: "rounded-md bg-background px-2 py-1 font-mono", children: part.authorization.userCode })] })) : null, part.state === "required" && part.authorization?.url ? (_jsx(Button, { asChild: true, size: "sm", children: _jsxs("a", { href: part.authorization.url, rel: "noreferrer", target: "_blank", children: [_jsx(ExternalLinkIcon, { className: "size-4" }), localize(locale, `Sign in with ${part.displayName}`, `使用 ${part.displayName} 登录`)] }) })) : null] })] }) }));
}
function authorizationTitle(part, locale) {
    if (part.state === "required") {
        return localize(locale, `Connect ${part.displayName}`, `连接 ${part.displayName}`);
    }
    if (part.outcome === "authorized") {
        return localize(locale, `${part.displayName} connected`, `${part.displayName} 已连接`);
    }
    return localize(locale, `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}`, `${part.displayName} 授权${formatAuthorizationOutcome(part.outcome, locale)}`);
}
function authorizationDescription(part, locale) {
    if (part.state === "required") {
        return part.description;
    }
    if (part.outcome === "authorized") {
        return localize(locale, `${part.displayName} connected.`, `${part.displayName} 已连接。`);
    }
    const tail = part.reason !== undefined ? ` (${part.reason})` : "";
    return localize(locale, `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}${tail}.`, `${part.displayName} 授权${formatAuthorizationOutcome(part.outcome, locale)}${tail}。`);
}
function formatAuthorizationOutcome(outcome, locale = "en") {
    switch (outcome) {
        case "authorized":
            return localize(locale, "authorized", "成功");
        case "declined":
            return localize(locale, "declined", "已拒绝");
        case "failed":
            return localize(locale, "failed", "失败");
        case "timed-out":
            return localize(locale, "timed out", "已超时");
    }
}
function formatBytes(size) {
    if (size === undefined) {
        return undefined;
    }
    if (size < 1024) {
        return `${size} B`;
    }
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function InputRequestActions({ canRespond, locale, onInputResponses, part, }) {
    const inputRequest = part.toolMetadata?.eve?.inputRequest;
    if (!inputRequest) {
        return null;
    }
    const inputResponse = part.toolMetadata?.eve?.inputResponse;
    const selectedOption = inputRequest.options?.find((option) => option.id === inputResponse?.optionId);
    return (_jsxs("div", { className: "space-y-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3", children: [_jsx("p", { className: "text-muted-foreground text-sm", children: inputRequest.prompt }), inputResponse ? (_jsxs("p", { className: "font-medium text-sm", children: [localize(locale, "Responded", "已回复"), ": ", selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId] })) : (_jsx("div", { className: "flex flex-wrap gap-2", children: inputRequest.options?.map((option) => (_jsx(Button, { disabled: !canRespond, onClick: () => {
                        void onInputResponses([
                            {
                                optionId: option.id,
                                requestId: inputRequest.requestId,
                            },
                        ]);
                    }, size: "sm", type: "button", variant: option.style === "danger" ? "destructive" : "default", children: option.label }, option.id))) }))] }));
}
function localize(locale, english, chinese) {
    return locale === "zh-CN" ? chinese : english;
}
function reasoningLabel(locale, streaming, duration) {
    if (streaming || duration === 0) {
        return _jsx(Shimmer, { duration: 1, children: localize(locale, "Thinking...", "思考中…") });
    }
    if (duration === undefined) {
        return _jsx("p", { children: localize(locale, "Reasoning complete", "思考完成") });
    }
    return _jsx("p", { children: localize(locale, `Thought for ${duration} seconds`, `思考了 ${duration} 秒`) });
}
function toolStatusLabel(locale, state) {
    switch (state) {
        case "approval-requested":
            return localize(locale, "Awaiting approval", "等待批准");
        case "approval-responded":
            return localize(locale, "Responded", "已回复");
        case "input-available":
            return localize(locale, "Running", "运行中");
        case "input-streaming":
            return localize(locale, "Pending", "准备中");
        case "output-available":
            return localize(locale, "Completed", "已完成");
        case "output-denied":
            return localize(locale, "Denied", "已拒绝");
        case "output-error":
            return localize(locale, "Error", "错误");
    }
}
function toolTitle(locale, part) {
    const kind = part.toolMetadata?.eve?.kind;
    if (kind === "load-skill")
        return localize(locale, "Loaded skill", "加载技能");
    if (kind === "subagent-call")
        return localize(locale, "Sub-agent", "子代理");
    const normalized = part.toolName.toLocaleLowerCase().replaceAll("-", "_");
    if (["bash", "shell", "terminal"].includes(normalized))
        return localize(locale, "Terminal command", "终端命令");
    if (["publish_preview", "website_preview"].includes(normalized))
        return localize(locale, "Published preview", "发布网站预览");
    if (["read_file", "read", "view_file"].includes(normalized))
        return localize(locale, "Read file", "读取文件");
    if (["write_file", "edit_file", "apply_patch"].includes(normalized))
        return localize(locale, "Edited files", "编辑文件");
    if (["web_search", "search_web", "search"].includes(normalized))
        return localize(locale, "Searched the web", "搜索网页");
    return part.toolName.replaceAll("_", " ");
}
function partKey(part, index) {
    switch (part.type) {
        case "authorization":
            return `authorization:${part.turnId}:${part.stepIndex}:${part.name}`;
        case "dynamic-tool":
            return part.toolCallId;
        default:
            return `${part.type}:${index}`;
    }
}
//# sourceMappingURL=agent-message.js.map