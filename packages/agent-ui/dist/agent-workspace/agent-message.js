"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BracesIcon, CheckIcon, CheckCircleIcon, ChevronDownIcon, CirclePauseIcon, CircleStopIcon, CopyIcon, ExternalLinkIcon, FileIcon, ImageIcon, KeyRoundIcon, LoaderCircleIcon, NetworkIcon, SearchIcon, TerminalIcon, FileSearchIcon, ListChecksIcon, XCircleIcon, } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StaticMarkdownText } from "../assistant-ui/markdown-text.js";
import { ReasoningContent, ReasoningRoot, ReasoningText, ReasoningTrigger, } from "../assistant-ui/reasoning.js";
import { ToolFallbackContent, ToolFallbackRoot, } from "../assistant-ui/tool-fallback.js";
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger, } from "../assistant-ui/tool-group.js";
import { DiffViewer } from "../assistant-ui/diff-viewer.js";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { presentAgentTurn, presentSubagentCall, } from "./turn-presentation.js";
function Message({ children, from, ...props }) {
    return _jsx("article", { className: cn("group flex w-full flex-col", from === "user" ? "items-end" : "items-start"), ...props, children: children });
}
function MessageContent({ children, className }) {
    return _jsx("div", { className: cn("min-w-0 max-w-full", className), children: children });
}
function MessageActions({ children, className }) {
    return _jsx("div", { className: cn("mt-1 flex gap-1", className), children: children });
}
function MessageAction({ children, label, onClick, tooltip }) {
    return _jsx(Button, { "aria-label": label, className: "size-7", onClick: onClick, size: "icon-sm", title: tooltip, variant: "ghost", children: children });
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
    return (_jsxs(Message, { "data-optimistic": message.metadata?.optimistic ? "true" : undefined, from: message.role, children: [_jsx(MessageContent, { className: message.role === "assistant" ? "w-full" : undefined, children: task ? (_jsxs(_Fragment, { children: [_jsxs(ExecutionGroup, { fallbackStartedAt: fallbackStartedAt, locale: locale, task: task, children: [_jsx(ProcessParts, { canRespond: canRespond, events: events, inActiveExecution: task.status === "running" || task.status === "waiting", locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, parts: task.processParts, turnId: message.metadata?.turnId }), task.proxiedInputParts.map((part) => (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-amber-700 dark:text-amber-300", children: localize(locale, "A delegated task needs your approval", "子代理任务需要你的批准") }), _jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: true, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: false, turnId: message.metadata?.turnId })] }, `proxied-input:${part.toolCallId}`)))] }), task.finalPart ? (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: false, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: task.finalPart, showCaret: isStreaming && task.finalPart.state === "streaming", turnId: message.metadata?.turnId })) : null] })) : message.parts.map((part, index) => (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: false, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: isStreaming && message.role === "assistant" && index === lastTextIndex, turnId: message.metadata?.turnId }, partKey(part, index)))) }), showCopyAction && message.role === "assistant" && responseText && !isStreaming ? (_jsx(CopyResponseAction, { locale: locale, text: responseText })) : null] }));
}
function AgentMessagePart({ canRespond, events, inActiveExecution, locale, onOpenSubagent, onInputResponses, part, showCaret, turnId, }) {
    switch (part.type) {
        case "step-start":
            return null;
        case "text":
            return (_jsxs("div", { className: "relative break-words", children: [_jsx(StaticMarkdownText, { text: part.text }), showCaret ? _jsx("span", { className: "ml-1 inline-block animate-pulse text-muted-foreground", children: "|" }) : null] }));
        case "reasoning": {
            return _jsx(ReasoningPart, { events: events, locale: locale, part: part, turnId: turnId });
        }
        case "file":
            return _jsx(AttachmentPart, { locale: locale, part: part });
        case "authorization":
            return _jsx(AuthorizationPrompt, { locale: locale, part: part });
        case "dynamic-tool": {
            return _jsx(ToolPart, { canRespond: canRespond, events: events, inActiveExecution: inActiveExecution, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part });
        }
    }
}
function ProcessParts({ canRespond, events, inActiveExecution, locale, onInputResponses, onOpenSubagent, parts, turnId, }) {
    const rendered = [];
    for (let index = 0; index < parts.length;) {
        const part = parts[index];
        if (part.type !== "dynamic-tool") {
            rendered.push(_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: inActiveExecution, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: part, showCaret: false, turnId: turnId }, partKey(part, index)));
            index += 1;
            continue;
        }
        const toolParts = [];
        let cursor = index;
        while (cursor < parts.length && parts[cursor]?.type === "dynamic-tool") {
            toolParts.push(parts[cursor]);
            cursor += 1;
        }
        const active = toolParts.some((toolPart) => !isToolTerminal(toolPart.state));
        const needsInput = toolParts.some((toolPart) => toolPart.state === "approval-requested" ||
            Boolean(toolPart.toolMetadata?.eve?.inputRequest && !toolPart.toolMetadata.eve.inputResponse));
        rendered.push(_jsxs(ToolGroupRoot, { defaultOpen: needsInput, variant: "ghost", children: [_jsx(ToolGroupTrigger, { active: active, count: toolParts.length, label: localize(locale, active
                        ? `Running ${toolParts.length} ${toolParts.length === 1 ? "tool" : "tools"}`
                        : `Ran ${toolParts.length} ${toolParts.length === 1 ? "tool" : "tools"}`, active ? `正在运行 ${toolParts.length} 个工具` : `已运行 ${toolParts.length} 个工具`) }), _jsx(ToolGroupContent, { children: toolParts.map((toolPart) => (_jsx(AgentMessagePart, { canRespond: canRespond, events: events, inActiveExecution: inActiveExecution, locale: locale, onInputResponses: onInputResponses, onOpenSubagent: onOpenSubagent, part: toolPart, showCaret: false, turnId: turnId }, toolPart.toolCallId))) })] }, `tools:${toolParts[0]?.toolCallId}`));
        index = cursor;
    }
    return _jsx(_Fragment, { children: rendered });
}
function ToolPart({ canRespond, events, locale, onInputResponses, onOpenSubagent, part, }) {
    const running = !isToolTerminal(part.state);
    const defaultOpen = part.state === "approval-requested" ||
        Boolean(part.toolMetadata?.eve?.inputRequest && !part.toolMetadata.eve.inputResponse);
    const Icon = toolIcon(part);
    return (_jsxs(ToolFallbackRoot, { className: "my-0", defaultOpen: defaultOpen, children: [_jsxs(CollapsibleTrigger, { className: "group/trigger flex w-fit max-w-full origin-left items-center gap-2 py-1.5 text-left text-sm text-muted-foreground transition-[color,scale] hover:text-foreground active:scale-[0.98]", children: [running ? (_jsx(LoaderCircleIcon, { className: "size-4 shrink-0 animate-spin [animation-duration:0.65s]" })) : part.state === "output-error" || part.state === "output-denied" ? (_jsx(XCircleIcon, { className: "size-4 shrink-0 text-destructive" })) : (_jsx(Icon, { className: "size-4 shrink-0" })), _jsx("span", { className: "truncate", children: toolTitle(locale, part) }), _jsx("span", { className: cn("shrink-0 text-xs", part.state === "output-error" && "text-destructive"), children: toolStatusLabel(locale, part.state) }), _jsx(ChevronDownIcon, { className: "size-3.5 shrink-0 -rotate-90 transition-transform group-data-[state=open]/trigger:rotate-0" })] }), _jsxs(ToolFallbackContent, { children: [_jsx(KnownToolContent, { events: events, locale: locale, onOpenSubagent: onOpenSubagent, part: part }), _jsx(InputRequestActions, { canRespond: canRespond, locale: locale, onInputResponses: onInputResponses, part: part }), part.errorText ? _jsx("p", { className: "whitespace-pre-wrap text-xs text-destructive", children: part.errorText }) : null] })] }));
}
function KnownToolContent({ events, locale, onOpenSubagent, part, }) {
    const normalized = normalizeToolName(part.toolName);
    const input = asRecord(part.input);
    const output = "output" in part ? part.output : undefined;
    const patch = toolPatch(part);
    const fileChange = toolFileChange(part);
    if (part.toolMetadata?.eve?.kind === "subagent-call") {
        return _jsx(SubagentProgress, { events: events, locale: locale, onOpenSubagent: onOpenSubagent, part: part });
    }
    if (["apply_patch", "patch_file", "write_file", "edit_file"].includes(normalized)) {
        if (patch) {
            return _jsx("div", { "data-tool-view": "diff", children: _jsx(DiffViewer, { contentClassName: "max-h-[28rem] overflow-auto", patch: patch, showIcon: true, size: "sm", variant: "ghost" }) });
        }
        if (fileChange) {
            return (_jsx("div", { "data-tool-view": "diff", children: _jsx(DiffViewer, { contentClassName: "max-h-[28rem] overflow-auto", newFile: { content: fileChange.newContent, name: fileChange.path }, oldFile: { content: fileChange.oldContent, name: fileChange.path }, showIcon: true, size: "sm", variant: "ghost" }) }));
        }
        return _jsx("p", { className: "text-xs text-muted-foreground", children: localize(locale, "Receiving file changes...", "正在接收文件变更…") });
    }
    if (["bash", "shell", "terminal", "exec_command"].includes(normalized)) {
        const command = firstString(input, ["command", "cmd"]);
        const result = shellOutput(output);
        return _jsx(ShellToolContent, { command: command, locale: locale, output: output, result: result, running: !isToolTerminal(part.state) });
    }
    if (["read_file", "read", "view_file"].includes(normalized)) {
        const path = firstString(input, ["path", "file", "filename"]);
        const result = readableOutput(output);
        return (_jsxs("div", { className: "space-y-1.5 text-xs", children: [path ? _jsx("p", { className: "truncate font-mono text-muted-foreground", children: path }) : null, result ? _jsx("pre", { className: "max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-foreground", children: result }) : null] }));
    }
    if (["todo", "todo_write", "update_plan"].includes(normalized)) {
        const items = todoItems(part.input, output);
        return (_jsxs("ol", { className: "space-y-1.5 text-sm", "data-tool-view": "tasks", children: [items.map((item, index) => (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: cn("mt-1.5 size-2 shrink-0 rounded-full border", item.done && "border-foreground bg-foreground") }), _jsx("span", { className: cn("min-w-0", item.done && "text-muted-foreground line-through"), children: item.label })] }, `${item.label}:${index}`))), items.length === 0 ? _jsx("li", { className: "text-xs text-muted-foreground", children: localize(locale, "Preparing tasks...", "正在整理任务…") }) : null] }));
    }
    if (["glob", "find_files", "grep", "search_files", "web_search", "search_web", "search"].includes(normalized)) {
        const query = firstString(input, ["query", "pattern", "glob", "path"]);
        const result = readableOutput(output);
        return (_jsxs("div", { className: "space-y-1.5 text-xs", children: [query ? _jsx("p", { className: "font-mono text-muted-foreground", children: query }) : null, result ? _jsx("pre", { className: "max-h-72 overflow-auto whitespace-pre-wrap break-words text-foreground", children: result }) : null] }));
    }
    if (["publish_preview", "website_preview"].includes(normalized)) {
        const result = readableOutput(output);
        const url = firstUrl(output) ?? firstString(input, ["url"]);
        return url ? (_jsxs("a", { className: "inline-flex items-center gap-1.5 text-sm underline underline-offset-4", href: url, rel: "noreferrer", target: "_blank", children: [url, _jsx(ExternalLinkIcon, { className: "size-3.5" })] })) : result ? _jsx("p", { className: "whitespace-pre-wrap text-xs text-muted-foreground", children: result }) : null;
    }
    if (["publish_artifact", "artifact_publish"].includes(normalized)) {
        const record = asRecord(output);
        const url = firstUrl(output);
        const filename = firstString(record, ["filename", "name"]) ?? firstString(input, ["filename", "path"]);
        return url ? (_jsxs("a", { className: "inline-flex items-center gap-1.5 text-sm underline underline-offset-4", href: url, rel: "noreferrer", target: "_blank", children: [filename ?? localize(locale, "Open artifact", "打开产物"), _jsx(ExternalLinkIcon, { className: "size-3.5" })] })) : _jsx("p", { className: "text-xs text-muted-foreground", children: filename ?? localize(locale, "Publishing artifact...", "正在发布产物…") });
    }
    if (["record_checkpoint", "checkpoint"].includes(normalized)) {
        const checkpoint = asRecord(output) ?? input;
        const summary = firstString(checkpoint, ["summary"]);
        const rows = [
            { label: localize(locale, "Completed", "已完成"), values: stringArray(checkpoint?.completed) },
            { label: localize(locale, "Next", "下一步"), values: stringArray(checkpoint?.next) },
            { label: localize(locale, "Risks", "风险"), values: stringArray(checkpoint?.risks) },
        ].filter((row) => row.values.length > 0);
        return (_jsxs("div", { className: "space-y-2 text-sm", children: [summary ? _jsx("p", { children: summary }) : null, rows.map((row) => _jsxs("div", { className: "flex gap-2 text-xs", children: [_jsx("span", { className: "w-14 shrink-0 text-muted-foreground", children: row.label }), _jsx("span", { children: row.values.join(" · ") })] }, row.label))] }));
    }
    if (part.toolMetadata?.eve?.kind === "load-skill") {
        const skill = firstString(input, ["name", "skill", "id"]) ?? readableOutput(output);
        return skill ? _jsx("p", { className: "text-xs text-muted-foreground", children: skill }) : null;
    }
    return (_jsxs("div", { className: "space-y-2 text-xs", "data-tool-view": "fallback", children: [part.input !== undefined ? (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-muted-foreground", children: localize(locale, "Parameters", "参数") }), _jsx("pre", { className: "max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2.5", children: safeStringify(part.input) })] })) : null, output !== undefined ? (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-muted-foreground", children: localize(locale, "Result", "结果") }), _jsx("pre", { className: "max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2.5", children: safeStringify(output) })] })) : null] }));
}
function toolIcon(part) {
    const normalized = normalizeToolName(part.toolName);
    if (["bash", "shell", "terminal", "exec_command"].includes(normalized))
        return TerminalIcon;
    if (["read_file", "read", "view_file", "glob", "find_files"].includes(normalized))
        return FileSearchIcon;
    if (["grep", "search_files", "web_search", "search_web", "search"].includes(normalized))
        return SearchIcon;
    if (["todo", "todo_write", "update_plan"].includes(normalized))
        return ListChecksIcon;
    if (["write_file", "edit_file", "apply_patch", "patch_file", "publish_artifact", "artifact_publish"].includes(normalized))
        return FileIcon;
    if (["record_checkpoint", "checkpoint"].includes(normalized))
        return CheckCircleIcon;
    return BracesIcon;
}
function isToolTerminal(state) {
    return state === "output-available" || state === "output-denied" || state === "output-error";
}
function normalizeToolName(toolName) {
    return toolName.toLocaleLowerCase().replaceAll("-", "_");
}
function ReasoningPart({ events, locale, part, turnId, }) {
    const timing = reasoningTiming(events, turnId, part.stepIndex);
    const durationSeconds = useElapsedSeconds(timing.startedAt, timing.endedAt);
    const streaming = part.state === "streaming";
    return (_jsxs(ReasoningRoot, { className: "mb-1", defaultOpen: streaming, streaming: streaming, variant: "ghost", children: [_jsx(ReasoningTrigger, { active: streaming, duration: timing.startedAt ? durationSeconds : undefined, label: streaming
                    ? reasoningSummary(part.text) ?? localize(locale, "Thinking", "正在思考")
                    : localize(locale, "Reasoning complete", "思考完成") }), _jsx(ReasoningContent, { "aria-busy": streaming, children: _jsx(ReasoningText, { children: _jsx(StaticMarkdownText, { text: part.text }) }) })] }));
}
function reasoningSummary(text) {
    const firstLine = text
        .replaceAll(/^[#>*\-\s]+/gm, "")
        .split(/\n|(?<=[.!?。！？])\s+/u)
        .map((line) => line.trim())
        .find(Boolean);
    if (!firstLine)
        return undefined;
    return firstLine.length > 64 ? `${firstLine.slice(0, 63)}…` : firstLine;
}
function reasoningTiming(events, turnId, stepIndex) {
    const matching = events.filter((event) => (event.type === "reasoning.appended" || event.type === "reasoning.completed") &&
        (turnId === undefined || event.data.turnId === turnId) &&
        (stepIndex === undefined || event.data.stepIndex === stepIndex));
    const startedAt = eventTime(matching[0]);
    const completed = [...matching].reverse().find((event) => event.type === "reasoning.completed");
    return {
        ...(startedAt ? { startedAt } : {}),
        ...(completed ? { endedAt: eventTime(completed) } : {}),
    };
}
function eventTime(event) {
    const at = event?.meta?.at;
    if (!at)
        return undefined;
    const parsed = Date.parse(at);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function toolFileChange(part) {
    const input = asRecord(part.input);
    if (!input)
        return undefined;
    const newContent = firstString(input, ["content", "newContent", "new_content", "new_string", "replacement"]);
    if (newContent === undefined)
        return undefined;
    const oldContent = firstString(input, ["oldContent", "old_content", "old_string", "before"]) ?? "";
    const path = firstString(input, ["path", "filePath", "file", "filename"]);
    return { newContent, oldContent, ...(path ? { path } : {}) };
}
function asRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function firstString(record, keys) {
    if (!record)
        return undefined;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.length > 0)
            return value;
    }
    return undefined;
}
function readableOutput(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        const lines = value.map((item) => readableOutput(item) ?? safeStringify(item));
        return lines.length > 0 ? lines.join("\n") : undefined;
    }
    const record = asRecord(value);
    if (!record)
        return value === undefined ? undefined : String(value);
    return firstString(record, ["stdout", "content", "text", "message", "result", "output", "url"])
        ?? (Object.keys(record).length > 0 ? safeStringify(record) : undefined);
}
function shellOutput(value) {
    if (typeof value === "string")
        return value || undefined;
    const record = asRecord(value);
    if (!record)
        return undefined;
    const stdout = typeof record.stdout === "string" ? record.stdout.trimEnd() : "";
    const stderr = typeof record.stderr === "string" ? record.stderr.trimEnd() : "";
    return [stdout, stderr].filter(Boolean).join("\n") || undefined;
}
function ShellToolContent({ command, locale, output, result, running, }) {
    const [copied, setCopied] = useState(false);
    const exitCode = shellExitCode(output);
    const copyCommand = async () => {
        if (!command)
            return;
        await navigator.clipboard.writeText(command);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
    };
    return (_jsxs("div", { className: "overflow-hidden rounded-md bg-muted/55 font-mono text-xs", "data-tool-view": "terminal", children: [_jsxs("div", { className: "flex min-h-9 items-center gap-2 px-3 py-2", children: [_jsx(TerminalIcon, { className: "size-3.5 shrink-0 text-muted-foreground" }), _jsx("pre", { className: "min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words text-foreground", children: command ?? localize(locale, "Shell command", "终端命令") }), running ? (_jsx(LoaderCircleIcon, { className: "size-3.5 shrink-0 animate-spin text-muted-foreground" })) : exitCode !== undefined ? (_jsxs("span", { className: cn("shrink-0 tabular-nums", exitCode === 0 ? "text-muted-foreground" : "text-destructive"), children: ["exit ", exitCode] })) : null, command ? (_jsx(Button, { "aria-label": localize(locale, "Copy command", "复制命令"), className: "size-6 shrink-0", onClick: () => void copyCommand(), size: "icon-sm", type: "button", variant: "ghost", children: copied ? _jsx(CheckIcon, { className: "size-3.5" }) : _jsx(CopyIcon, { className: "size-3.5" }) })) : null] }), result ? (_jsx("pre", { className: "max-h-80 overflow-auto border-t border-border/50 px-3 py-2.5 whitespace-pre-wrap break-words text-muted-foreground", children: result })) : !running && output !== undefined ? (_jsx("p", { className: "border-t border-border/50 px-3 py-2 font-sans text-muted-foreground", children: localize(locale, "Command completed with no output.", "命令已完成，没有输出。") })) : null] }));
}
function shellExitCode(value) {
    const record = asRecord(value);
    if (!record)
        return undefined;
    for (const key of ["exitCode", "exit_code", "code"]) {
        const candidate = record[key];
        if (typeof candidate === "number" && Number.isFinite(candidate))
            return candidate;
    }
    return undefined;
}
function stringArray(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function firstUrl(value) {
    const direct = typeof value === "string" ? value : firstString(asRecord(value), ["url", "previewUrl", "preview_url"]);
    if (!direct)
        return undefined;
    const match = direct.match(/https?:\/\/[^\s"'<>]+/u);
    return match?.[0];
}
function todoItems(inputValue, outputValue) {
    const source = todoArray(inputValue) ?? todoArray(outputValue) ?? [];
    return source.flatMap((item) => {
        if (typeof item === "string")
            return [{ done: false, label: item }];
        const record = asRecord(item);
        if (!record)
            return [];
        const label = firstString(record, ["content", "label", "title", "text", "task"]);
        if (!label)
            return [];
        const status = firstString(record, ["status", "state"]);
        const done = record.done === true || status === "completed" || status === "done";
        return [{ done, label }];
    });
}
function todoArray(value) {
    if (Array.isArray(value))
        return value;
    const record = asRecord(value);
    if (!record)
        return undefined;
    const candidate = record.todos ?? record.items ?? record.tasks ?? record.plan;
    return Array.isArray(candidate) ? candidate : undefined;
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
    return (_jsxs("div", { className: cn("flex items-start gap-3 py-1.5 text-sm", presentation.status === "failed"
            ? "text-destructive"
            : "text-foreground"), role: isActive ? "status" : undefined, children: [isActive ? (_jsx(LoaderCircleIcon, { className: "mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" })) : presentation.status === "completed" ? (_jsx(CheckCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" })) : presentation.status === "cancelled" ? (_jsx(CircleStopIcon, { className: "mt-0.5 size-4 shrink-0 text-muted-foreground" })) : (_jsx(XCircleIcon, { className: "mt-0.5 size-4 shrink-0 text-destructive" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-foreground", children: title }), _jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [_jsx(NetworkIcon, { className: "mr-1 inline size-3" }), presentation.name === "agent"
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
    if (["bash", "shell", "terminal", "exec_command"].includes(normalized))
        return localize(locale, "Terminal command", "终端命令");
    if (["publish_preview", "website_preview"].includes(normalized))
        return localize(locale, "Published preview", "发布网站预览");
    if (["publish_artifact", "artifact_publish"].includes(normalized))
        return localize(locale, "Published artifact", "发布产物");
    if (["record_checkpoint", "checkpoint"].includes(normalized))
        return localize(locale, "Saved checkpoint", "保存检查点");
    if (["read_file", "read", "view_file"].includes(normalized))
        return localize(locale, "Read file", "读取文件");
    if (["write_file", "edit_file", "apply_patch", "patch_file"].includes(normalized))
        return localize(locale, "Edited files", "编辑文件");
    if (["glob", "find_files"].includes(normalized))
        return localize(locale, "Found files", "查找文件");
    if (["grep", "search_files"].includes(normalized))
        return localize(locale, "Searched files", "搜索文件");
    if (["todo", "todo_write", "update_plan"].includes(normalized))
        return localize(locale, "Updated tasks", "更新任务列表");
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