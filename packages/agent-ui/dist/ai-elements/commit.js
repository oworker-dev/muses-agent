"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Avatar, AvatarFallback } from "../ui/avatar.js";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { CheckIcon, CopyIcon, FileIcon, GitCommitIcon, MinusIcon, PlusIcon, } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
export const Commit = ({ className, children, ...props }) => (_jsx(Collapsible, { className: cn("rounded-lg border bg-background", className), ...props, children: children }));
export const CommitHeader = ({ className, children, ...props }) => (_jsx(CollapsibleTrigger, { asChild: true, ...props, children: _jsx("div", { className: cn("group flex cursor-pointer items-center justify-between gap-4 p-3 text-left transition-colors hover:opacity-80", className), children: children }) }));
export const CommitHash = ({ className, children, ...props }) => (_jsxs("span", { className: cn("font-mono text-xs", className), ...props, children: [_jsx(GitCommitIcon, { className: "mr-1 inline-block size-3" }), children] }));
export const CommitMessage = ({ className, children, ...props }) => (_jsx("span", { className: cn("font-medium text-sm", className), ...props, children: children }));
export const CommitMetadata = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center gap-2 text-muted-foreground text-xs", className), ...props, children: children }));
export const CommitSeparator = ({ className, children, ...props }) => (_jsx("span", { className: className, ...props, children: children ?? "•" }));
export const CommitInfo = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex flex-1 flex-col", className), ...props, children: children }));
export const CommitAuthor = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center", className), ...props, children: children }));
export const CommitAuthorAvatar = ({ initials, className, ...props }) => (_jsx(Avatar, { className: cn("size-8", className), ...props, children: _jsx(AvatarFallback, { className: "text-xs", children: initials }) }));
const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
});
const formatRelativeDate = (date) => {
    const days = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return relativeTimeFormat.format(days, "day");
};
export const CommitTimestamp = ({ date, className, children, ...props }) => {
    const [formatted, setFormatted] = useState("");
    const updateFormatted = useCallback(() => {
        setFormatted(formatRelativeDate(date));
    }, [date]);
    useEffect(() => {
        updateFormatted();
    }, [updateFormatted]);
    return (_jsx("time", { className: cn("text-xs", className), dateTime: date.toISOString(), ...props, children: children ?? formatted }));
};
const handleActionsClick = (e) => e.stopPropagation();
const handleActionsKeyDown = (e) => e.stopPropagation();
export const CommitActions = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center gap-1", className), onClick: handleActionsClick, onKeyDown: handleActionsKeyDown, role: "group", ...props, children: children }));
export const CommitCopyButton = ({ hash, onCopy, onError, timeout = 2000, children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const copyToClipboard = useCallback(async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }
        try {
            if (!isCopied) {
                await navigator.clipboard.writeText(hash);
                setIsCopied(true);
                onCopy?.();
                timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
            }
        }
        catch (error) {
            onError?.(error);
        }
    }, [hash, onCopy, onError, timeout, isCopied]);
    useEffect(() => () => {
        window.clearTimeout(timeoutRef.current);
    }, []);
    const Icon = isCopied ? CheckIcon : CopyIcon;
    return (_jsx(Button, { className: cn("size-7 shrink-0", className), onClick: copyToClipboard, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Icon, { size: 14 }) }));
};
export const CommitContent = ({ className, children, ...props }) => (_jsx(CollapsibleContent, { className: cn("border-t p-3", className), ...props, children: children }));
export const CommitFiles = ({ className, children, ...props }) => (_jsx("div", { className: cn("space-y-1", className), ...props, children: children }));
export const CommitFile = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50", className), ...props, children: children }));
export const CommitFileInfo = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex min-w-0 items-center gap-2", className), ...props, children: children }));
const fileStatusStyles = {
    added: "text-green-600 dark:text-green-400",
    deleted: "text-red-600 dark:text-red-400",
    modified: "text-yellow-600 dark:text-yellow-400",
    renamed: "text-blue-600 dark:text-blue-400",
};
const fileStatusLabels = {
    added: "A",
    deleted: "D",
    modified: "M",
    renamed: "R",
};
export const CommitFileStatus = ({ status, className, children, ...props }) => (_jsx("span", { className: cn("font-medium font-mono text-xs", fileStatusStyles[status], className), ...props, children: children ?? fileStatusLabels[status] }));
export const CommitFileIcon = ({ className, ...props }) => (_jsx(FileIcon, { className: cn("size-3.5 shrink-0 text-muted-foreground", className), ...props }));
export const CommitFilePath = ({ className, children, ...props }) => (_jsx("span", { className: cn("truncate font-mono text-xs", className), ...props, children: children }));
export const CommitFileChanges = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex shrink-0 items-center gap-1 font-mono text-xs", className), ...props, children: children }));
export const CommitFileAdditions = ({ count, className, children, ...props }) => {
    if (count <= 0) {
        return null;
    }
    return (_jsx("span", { className: cn("text-green-600 dark:text-green-400", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(PlusIcon, { className: "inline-block size-3" }), count] })) }));
};
export const CommitFileDeletions = ({ count, className, children, ...props }) => {
    if (count <= 0) {
        return null;
    }
    return (_jsx("span", { className: cn("text-red-600 dark:text-red-400", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(MinusIcon, { className: "inline-block size-3" }), count] })) }));
};
//# sourceMappingURL=commit.js.map