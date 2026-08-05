"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../ui/badge.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, ExternalLinkIcon, WrenchIcon, XCircleIcon, } from "lucide-react";
import { isValidElement } from "react";
import { CodeBlock } from "./code-block.js";
export const Tool = ({ className, ...props }) => (_jsx(Collapsible, { className: cn("group not-prose mb-4 w-full rounded-md border", className), ...props }));
const statusLabels = {
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "input-available": "Running",
    "input-streaming": "Pending",
    "output-available": "Completed",
    "output-denied": "Denied",
    "output-error": "Error",
};
const statusIcons = {
    "approval-requested": _jsx(ClockIcon, { className: "size-4 text-yellow-600" }),
    "approval-responded": _jsx(CheckCircleIcon, { className: "size-4 text-blue-600" }),
    "input-available": _jsx(ClockIcon, { className: "size-4 animate-pulse" }),
    "input-streaming": _jsx(CircleIcon, { className: "size-4" }),
    "output-available": _jsx(CheckCircleIcon, { className: "size-4 text-green-600" }),
    "output-denied": _jsx(XCircleIcon, { className: "size-4 text-orange-600" }),
    "output-error": _jsx(XCircleIcon, { className: "size-4 text-red-600" }),
};
export const getStatusBadge = (status, label = statusLabels[status]) => (_jsxs(Badge, { className: "gap-1.5 rounded-full text-xs", variant: "secondary", children: [statusIcons[status], label] }));
export const ToolHeader = ({ className, title, type, state, statusLabel, toolName, ...props }) => {
    const derivedName = type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");
    return (_jsxs(CollapsibleTrigger, { className: cn("flex w-full items-center justify-between gap-4 p-3", className), ...props, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(WrenchIcon, { className: "size-4 text-muted-foreground" }), _jsx("span", { className: "font-medium text-sm", children: title ?? derivedName }), getStatusBadge(state, statusLabel)] }), _jsx(ChevronDownIcon, { className: "size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" })] }));
};
export const ToolContent = ({ className, ...props }) => (_jsx(CollapsibleContent, { className: cn("data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in", className), ...props }));
export const ToolInput = ({ className, input, label = "Parameters", ...props }) => (_jsxs("div", { className: cn("space-y-2 overflow-hidden", className), ...props, children: [_jsx("h4", { className: "font-medium text-muted-foreground text-xs uppercase tracking-wide", children: label }), _jsx("div", { className: "rounded-md bg-muted/50", children: _jsx(CodeBlock, { code: JSON.stringify(input, null, 2), language: "json" }) })] }));
export const ToolOutput = ({ className, output, errorLabel = "Error", errorText, resultLabel = "Result", ...props }) => {
    if (!(output || errorText)) {
        return null;
    }
    let Output = _jsx("div", { children: output });
    const preview = previewOutput(output);
    const artifact = artifactOutput(output);
    if (preview) {
        Output = (_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-3", children: [_jsxs("a", { className: "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90", href: preview.url, rel: "noreferrer", target: "_blank", children: [_jsx(ExternalLinkIcon, { className: "size-4" }), "Open preview"] }), _jsxs("span", { className: "text-muted-foreground text-xs", children: [preview.fileCount, " files - ", formatBytes(preview.bytes)] })] }));
    }
    else if (artifact) {
        Output = (_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-3", children: [_jsxs("a", { className: "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90", href: artifact.url, rel: "noreferrer", target: "_blank", children: [_jsx(ExternalLinkIcon, { className: "size-4" }), "Open artifact"] }), _jsxs("span", { className: "text-muted-foreground text-xs", children: [artifact.filename, " - ", formatBytes(artifact.bytes)] })] }));
    }
    else if (typeof output === "object" && !isValidElement(output)) {
        Output = _jsx(CodeBlock, { code: JSON.stringify(output, null, 2), language: "json" });
    }
    else if (typeof output === "string") {
        Output = _jsx(CodeBlock, { code: output, language: "json" });
    }
    return (_jsxs("div", { className: cn("space-y-2", className), ...props, children: [_jsx("h4", { className: "font-medium text-muted-foreground text-xs uppercase tracking-wide", children: errorText ? errorLabel : resultLabel }), _jsxs("div", { className: cn("overflow-x-auto rounded-md text-xs [&_table]:w-full", errorText ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-foreground"), children: [errorText && _jsx("div", { children: errorText }), Output] })] }));
};
function previewOutput(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const record = value;
    if (record.kind !== "website-preview" || typeof record.url !== "string")
        return undefined;
    try {
        const url = new URL(record.url, window.location.href);
        if (url.protocol !== "http:" && url.protocol !== "https:")
            return undefined;
        return {
            bytes: typeof record.bytes === "number" ? record.bytes : 0,
            fileCount: typeof record.fileCount === "number" ? record.fileCount : 0,
            url: url.toString(),
        };
    }
    catch {
        return undefined;
    }
}
function artifactOutput(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const record = value;
    if (record.kind !== "artifact" || typeof record.url !== "string" || typeof record.filename !== "string")
        return undefined;
    try {
        const url = new URL(record.url, window.location.href);
        if (url.protocol !== "http:" && url.protocol !== "https:")
            return undefined;
        return {
            bytes: typeof record.bytes === "number" ? record.bytes : 0,
            filename: record.filename,
            url: url.toString(),
        };
    }
    catch {
        return undefined;
    }
}
function formatBytes(value) {
    if (value < 1_024)
        return `${value} B`;
    if (value < 1_024 * 1_024)
        return `${Math.round(value / 1_024)} KB`;
    return `${(value / (1_024 * 1_024)).toFixed(1)} MB`;
}
//# sourceMappingURL=tool.js.map