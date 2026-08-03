"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckIcon, CircleOffIcon, PlugIcon, SparklesIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "../ui/dialog.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
export function AgentSettingsDialog({ extensions, locale, messages, onLocaleChange, onOpenChange, open, }) {
    return (_jsx(Dialog, { onOpenChange: onOpenChange, open: open, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: messages.settings }), _jsx(DialogDescription, { children: messages.settingsDescription })] }), _jsxs("section", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium", children: messages.interfaceLanguage }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(LocaleButton, { active: locale === "en", label: messages.english, onClick: () => onLocaleChange("en") }), _jsx(LocaleButton, { active: locale === "zh-CN", label: messages.simplifiedChinese, onClick: () => onLocaleChange("zh-CN") })] })] }), _jsxs("section", { className: "space-y-3 border-t pt-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium", children: messages.extensions }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: messages.extensionsDescription })] }), _jsxs("div", { className: "space-y-2", children: [extensions.map((extension) => (_jsxs("div", { className: "flex items-start gap-3 rounded-md border p-3", children: [_jsx("span", { className: "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", children: extension.kind === "skill" ? _jsx(SparklesIcon, { className: "size-4" }) : _jsx(PlugIcon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-medium text-sm", children: extension.label }), extension.version ? _jsxs("span", { className: "font-mono text-[11px] text-muted-foreground", children: ["v", extension.version] }) : null] }), extension.description ? _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: extension.description }) : null] }), _jsx("span", { className: cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-medium", extension.status === "available" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"), children: extensionStatus(messages, extension.status) })] }, `${extension.kind}:${extension.id}`))), !extensions.some((extension) => extension.kind === "mcp") ? (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground", children: [_jsx(CircleOffIcon, { className: "size-4" }), messages.noMcpConnections] })) : null] })] })] }) }));
}
function extensionStatus(messages, status) {
    if (status === "available")
        return messages.available;
    if (status === "disabled")
        return messages.disabled;
    return messages.unconfigured;
}
function LocaleButton({ active, label, onClick }) {
    return (_jsxs(Button, { className: cn("justify-between", active && "border-foreground/30 bg-accent"), onClick: onClick, variant: "outline", children: [label, _jsx(CheckIcon, { className: cn("size-4", active ? "opacity-100" : "opacity-0") })] }));
}
//# sourceMappingURL=agent-settings-dialog.js.map