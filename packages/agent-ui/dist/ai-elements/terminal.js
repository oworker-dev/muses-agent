"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import Ansi from "ansi-to-react";
import { CheckIcon, CopyIcon, TerminalIcon, Trash2Icon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
const TerminalContext = createContext({
    autoScroll: true,
    isStreaming: false,
    output: "",
});
export const TerminalHeader = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between border-zinc-800 border-b px-4 py-2", className), ...props, children: children }));
export const TerminalTitle = ({ className, children, ...props }) => (_jsxs("div", { className: cn("flex items-center gap-2 text-sm text-zinc-400", className), ...props, children: [_jsx(TerminalIcon, { className: "size-4" }), children ?? "Terminal"] }));
export const TerminalStatus = ({ className, children, ...props }) => {
    const { isStreaming } = useContext(TerminalContext);
    if (!isStreaming) {
        return null;
    }
    return (_jsx("div", { className: cn("flex items-center gap-2 text-xs text-zinc-400", className), ...props, children: children }));
};
export const TerminalActions = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center gap-1", className), ...props, children: children }));
export const TerminalCopyButton = ({ onCopy, onError, timeout = 2000, children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const { output } = useContext(TerminalContext);
    const copyToClipboard = useCallback(async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }
        try {
            await navigator.clipboard.writeText(output);
            setIsCopied(true);
            onCopy?.();
            timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
        }
        catch (error) {
            onError?.(error);
        }
    }, [output, onCopy, onError, timeout]);
    useEffect(() => () => {
        window.clearTimeout(timeoutRef.current);
    }, []);
    const Icon = isCopied ? CheckIcon : CopyIcon;
    return (_jsx(Button, { className: cn("size-7 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100", className), onClick: copyToClipboard, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Icon, { size: 14 }) }));
};
export const TerminalClearButton = ({ children, className, ...props }) => {
    const { onClear } = useContext(TerminalContext);
    if (!onClear) {
        return null;
    }
    return (_jsx(Button, { className: cn("size-7 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100", className), onClick: onClear, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Trash2Icon, { size: 14 }) }));
};
export const TerminalContent = ({ className, children, ...props }) => {
    const { output, isStreaming, autoScroll } = useContext(TerminalContext);
    const containerRef = useRef(null);
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [output, autoScroll]);
    return (_jsx("div", { className: cn("max-h-96 overflow-auto p-4 font-mono text-sm leading-relaxed", className), ref: containerRef, ...props, children: children ?? (_jsxs("pre", { className: "whitespace-pre-wrap break-words", children: [_jsx(Ansi, { children: output }), isStreaming && (_jsx("span", { className: "ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-100" }))] })) }));
};
export const Terminal = ({ output, isStreaming = false, autoScroll = true, onClear, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ autoScroll, isStreaming, onClear, output }), [autoScroll, isStreaming, onClear, output]);
    return (_jsx(TerminalContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("flex flex-col overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsxs(TerminalHeader, { children: [_jsx(TerminalTitle, {}), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(TerminalStatus, {}), _jsxs(TerminalActions, { children: [_jsx(TerminalCopyButton, {}), onClear && _jsx(TerminalClearButton, {})] })] })] }), _jsx(TerminalContent, {})] })) }) }));
};
//# sourceMappingURL=terminal.js.map