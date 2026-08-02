"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircleIcon, ExternalLinkIcon, FileIcon, ImageIcon, KeyRoundIcon, XCircleIcon, } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "../ai-elements/message.js";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../ai-elements/reasoning.js";
import { Shimmer } from "../ai-elements/shimmer.js";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, } from "../ai-elements/tool.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
export function AgentMessage({ canRespond, isStreaming, locale, message, onInputResponses, }) {
    const lastTextIndex = message.parts.reduce((last, part, index) => (part.type === "text" ? index : last), -1);
    return (_jsx(Message, { "data-optimistic": message.metadata?.optimistic ? "true" : undefined, from: message.role, children: _jsx(MessageContent, { children: message.parts.map((part, index) => (_jsx(AgentMessagePart, { canRespond: canRespond, locale: locale, onInputResponses: onInputResponses, part: part, showCaret: isStreaming && message.role === "assistant" && index === lastTextIndex }, partKey(part, index)))) }) }));
}
function AgentMessagePart({ canRespond, locale, onInputResponses, part, showCaret, }) {
    switch (part.type) {
        case "step-start":
            return null;
        case "text":
            return (_jsx(MessageResponse, { caret: "block", isAnimating: showCaret, children: part.text }));
        case "reasoning":
            return (_jsxs(Reasoning, { defaultOpen: true, isStreaming: part.state === "streaming", children: [_jsx(ReasoningTrigger, { getThinkingMessage: (streaming, duration) => reasoningLabel(locale, streaming, duration) }), _jsx(ReasoningContent, { children: part.text })] }));
        case "file":
            return _jsx(AttachmentPart, { locale: locale, part: part });
        case "authorization":
            return _jsx(AuthorizationPrompt, { locale: locale, part: part });
        case "dynamic-tool":
            return (_jsxs(Tool, { defaultOpen: part.state === "approval-requested" || part.state === "approval-responded", children: [_jsx(ToolHeader, { state: part.state, statusLabel: toolStatusLabel(locale, part.state), title: part.toolName, toolName: part.toolName, type: "dynamic-tool" }), _jsxs(ToolContent, { children: [_jsx(ToolInput, { input: part.input, label: localize(locale, "Parameters", "参数") }), _jsx(InputRequestActions, { canRespond: canRespond, locale: locale, part: part, onInputResponses: onInputResponses }), _jsx(ToolOutput, { errorLabel: localize(locale, "Error", "错误"), errorText: part.errorText, output: part.output, resultLabel: localize(locale, "Result", "结果") })] })] }));
    }
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
        return _jsx("p", { children: localize(locale, "Thought for a few seconds", "思考了几秒") });
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