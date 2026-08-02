"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "../ui/dialog.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
export function AgentSettingsDialog({ locale, messages, onLocaleChange, onOpenChange, open, }) {
    return (_jsx(Dialog, { onOpenChange: onOpenChange, open: open, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: messages.settings }), _jsx(DialogDescription, { children: messages.settingsDescription })] }), _jsxs("section", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium", children: messages.interfaceLanguage }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(LocaleButton, { active: locale === "en", label: messages.english, onClick: () => onLocaleChange("en") }), _jsx(LocaleButton, { active: locale === "zh-CN", label: messages.simplifiedChinese, onClick: () => onLocaleChange("zh-CN") })] })] })] }) }));
}
function LocaleButton({ active, label, onClick }) {
    return (_jsxs(Button, { className: cn("justify-between", active && "border-foreground/30 bg-accent"), onClick: onClick, variant: "outline", children: [label, _jsx(CheckIcon, { className: cn("size-4", active ? "opacity-100" : "opacity-0") })] }));
}
//# sourceMappingURL=agent-settings-dialog.js.map