"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, CopyIcon, } from "lucide-react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
const STACK_FRAME_WITH_PARENS_REGEX = /^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/;
const STACK_FRAME_WITHOUT_FN_REGEX = /^at\s+(.+):(\d+):(\d+)$/;
const ERROR_TYPE_REGEX = /^(\w+Error|Error):\s*(.*)$/;
const AT_PREFIX_REGEX = /^at\s+/;
const StackTraceContext = createContext(null);
const useStackTrace = () => {
    const context = useContext(StackTraceContext);
    if (!context) {
        throw new Error("StackTrace components must be used within StackTrace");
    }
    return context;
};
const parseStackFrame = (line) => {
    const trimmed = line.trim();
    const withParensMatch = trimmed.match(STACK_FRAME_WITH_PARENS_REGEX);
    if (withParensMatch) {
        const [, functionName, filePath, lineNum, colNum] = withParensMatch;
        const isInternal = filePath.includes("node_modules") ||
            filePath.startsWith("node:") ||
            filePath.includes("internal/");
        return {
            columnNumber: colNum ? Number.parseInt(colNum, 10) : null,
            filePath: filePath ?? null,
            functionName: functionName ?? null,
            isInternal,
            lineNumber: lineNum ? Number.parseInt(lineNum, 10) : null,
            raw: trimmed,
        };
    }
    const withoutFnMatch = trimmed.match(STACK_FRAME_WITHOUT_FN_REGEX);
    if (withoutFnMatch) {
        const [, filePath, lineNum, colNum] = withoutFnMatch;
        const isInternal = (filePath?.includes("node_modules") ?? false) ||
            (filePath?.startsWith("node:") ?? false) ||
            (filePath?.includes("internal/") ?? false);
        return {
            columnNumber: colNum ? Number.parseInt(colNum, 10) : null,
            filePath: filePath ?? null,
            functionName: null,
            isInternal,
            lineNumber: lineNum ? Number.parseInt(lineNum, 10) : null,
            raw: trimmed,
        };
    }
    return {
        columnNumber: null,
        filePath: null,
        functionName: null,
        isInternal: trimmed.includes("node_modules") || trimmed.includes("node:"),
        lineNumber: null,
        raw: trimmed,
    };
};
const parseStackTrace = (trace) => {
    const lines = trace.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
        return {
            errorMessage: trace,
            errorType: null,
            frames: [],
            raw: trace,
        };
    }
    const firstLine = lines[0].trim();
    let errorType = null;
    let errorMessage = firstLine;
    const errorMatch = firstLine.match(ERROR_TYPE_REGEX);
    if (errorMatch) {
        const [, type, msg] = errorMatch;
        errorType = type;
        errorMessage = msg || "";
    }
    const frames = lines
        .slice(1)
        .filter((line) => line.trim().startsWith("at "))
        .map(parseStackFrame);
    return {
        errorMessage,
        errorType,
        frames,
        raw: trace,
    };
};
export const StackTrace = memo(({ trace, className, open, defaultOpen = false, onOpenChange, onFilePathClick, children, ...props }) => {
    const [isOpen, setIsOpen] = useControllableState({
        defaultProp: defaultOpen,
        onChange: onOpenChange,
        prop: open,
    });
    const parsedTrace = useMemo(() => parseStackTrace(trace), [trace]);
    const contextValue = useMemo(() => ({
        isOpen,
        onFilePathClick,
        raw: trace,
        setIsOpen,
        trace: parsedTrace,
    }), [parsedTrace, trace, isOpen, setIsOpen, onFilePathClick]);
    return (_jsx(StackTraceContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("not-prose w-full overflow-hidden rounded-lg border bg-background font-mono text-sm", className), ...props, children: children }) }));
});
export const StackTraceHeader = memo(({ className, children, ...props }) => {
    const { isOpen, setIsOpen } = useStackTrace();
    return (_jsx(Collapsible, { onOpenChange: setIsOpen, open: isOpen, children: _jsx(CollapsibleTrigger, { asChild: true, ...props, children: _jsx("div", { className: cn("flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50", className), children: children }) }) }));
});
export const StackTraceError = memo(({ className, children, ...props }) => (_jsxs("div", { className: cn("flex flex-1 items-center gap-2 overflow-hidden", className), ...props, children: [_jsx(AlertTriangleIcon, { className: "size-4 shrink-0 text-destructive" }), children] })));
export const StackTraceErrorType = memo(({ className, children, ...props }) => {
    const { trace } = useStackTrace();
    return (_jsx("span", { className: cn("shrink-0 font-semibold text-destructive", className), ...props, children: children ?? trace.errorType }));
});
export const StackTraceErrorMessage = memo(({ className, children, ...props }) => {
    const { trace } = useStackTrace();
    return (_jsx("span", { className: cn("truncate text-foreground", className), ...props, children: children ?? trace.errorMessage }));
});
const handleActionsClick = (e) => e.stopPropagation();
const handleActionsKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
    }
};
export const StackTraceActions = memo(({ className, children, ...props }) => (_jsx("div", { className: cn("flex shrink-0 items-center gap-1", className), onClick: handleActionsClick, onKeyDown: handleActionsKeyDown, role: "group", ...props, children: children })));
export const StackTraceCopyButton = memo(({ onCopy, onError, timeout = 2000, className, children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const { raw } = useStackTrace();
    const copyToClipboard = useCallback(async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }
        try {
            await navigator.clipboard.writeText(raw);
            setIsCopied(true);
            onCopy?.();
            timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
        }
        catch (error) {
            onError?.(error);
        }
    }, [raw, onCopy, onError, timeout]);
    useEffect(() => () => {
        window.clearTimeout(timeoutRef.current);
    }, []);
    const Icon = isCopied ? CheckIcon : CopyIcon;
    return (_jsx(Button, { className: cn("size-7", className), onClick: copyToClipboard, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Icon, { size: 14 }) }));
});
export const StackTraceExpandButton = memo(({ className, ...props }) => {
    const { isOpen } = useStackTrace();
    return (_jsx("div", { className: cn("flex size-7 items-center justify-center", className), ...props, children: _jsx(ChevronDownIcon, { className: cn("size-4 text-muted-foreground transition-transform", isOpen ? "rotate-180" : "rotate-0") }) }));
});
export const StackTraceContent = memo(({ className, maxHeight = 400, children, ...props }) => {
    const { isOpen } = useStackTrace();
    return (_jsx(Collapsible, { open: isOpen, children: _jsx(CollapsibleContent, { className: cn("overflow-auto border-t bg-muted/30", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=open]:animate-in", className), style: { maxHeight }, ...props, children: children }) }));
});
const FilePathButton = memo(({ frame, onFilePathClick }) => {
    const handleClick = useCallback(() => {
        if (frame.filePath) {
            onFilePathClick?.(frame.filePath, frame.lineNumber ?? undefined, frame.columnNumber ?? undefined);
        }
    }, [frame, onFilePathClick]);
    return (_jsxs("button", { className: cn("underline decoration-dotted hover:text-primary", onFilePathClick && "cursor-pointer"), disabled: !onFilePathClick, onClick: handleClick, type: "button", children: [frame.filePath, frame.lineNumber !== null && `:${frame.lineNumber}`, frame.columnNumber !== null && `:${frame.columnNumber}`] }));
});
FilePathButton.displayName = "FilePathButton";
export const StackTraceFrames = memo(({ className, showInternalFrames = true, ...props }) => {
    const { trace, onFilePathClick } = useStackTrace();
    const framesToShow = showInternalFrames
        ? trace.frames
        : trace.frames.filter((f) => !f.isInternal);
    return (_jsxs("div", { className: cn("space-y-1 p-3", className), ...props, children: [framesToShow.map((frame) => (_jsxs("div", { className: cn("text-xs", frame.isInternal
                    ? "text-muted-foreground/50"
                    : "text-foreground/90"), children: [_jsx("span", { className: "text-muted-foreground", children: "at " }), frame.functionName && (_jsxs("span", { className: frame.isInternal ? "" : "text-foreground", children: [frame.functionName, " "] })), frame.filePath && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-muted-foreground", children: "(" }), _jsx(FilePathButton, { frame: frame, onFilePathClick: onFilePathClick }), _jsx("span", { className: "text-muted-foreground", children: ")" })] })), !(frame.filePath || frame.functionName) && (_jsx("span", { children: frame.raw.replace(AT_PREFIX_REGEX, "") }))] }, frame.raw))), framesToShow.length === 0 && (_jsx("div", { className: "text-muted-foreground text-xs", children: "No stack frames" }))] }));
});
StackTrace.displayName = "StackTrace";
StackTraceHeader.displayName = "StackTraceHeader";
StackTraceError.displayName = "StackTraceError";
StackTraceErrorType.displayName = "StackTraceErrorType";
StackTraceErrorMessage.displayName = "StackTraceErrorMessage";
StackTraceActions.displayName = "StackTraceActions";
StackTraceCopyButton.displayName = "StackTraceCopyButton";
StackTraceExpandButton.displayName = "StackTraceExpandButton";
StackTraceContent.displayName = "StackTraceContent";
StackTraceFrames.displayName = "StackTraceFrames";
//# sourceMappingURL=stack-trace.js.map