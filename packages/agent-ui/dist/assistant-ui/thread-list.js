"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Skeleton } from "../ui/skeleton.js";
import { cn } from "../utils.js";
import { AuiIf, ThreadListItemMorePrimitive, ThreadListItemPrimitive, ThreadListPrimitive, useAui, useAuiState, } from "@assistant-ui/react";
import { ArchiveIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, } from "lucide-react";
import { forwardRef, Fragment, useEffect, useMemo, useRef, useState, } from "react";
export const ThreadList = () => {
    const [search, setSearch] = useState("");
    const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
    return (_jsxs(ThreadListRoot, { children: [_jsx(ThreadListNew, {}), hasThreads && (_jsx(ThreadListSearch, { value: search, onValueChange: setSearch })), _jsx(ThreadListItems, { searchQuery: hasThreads ? search : "" })] }));
};
export const ThreadListSearch = forwardRef(({ className, value, onValueChange, ...props }, ref) => {
    return (_jsxs("div", { "data-slot": "aui_thread-list-search", className: "relative px-0.5 py-1", children: [_jsx(SearchIcon, { "data-slot": "aui_thread-list-search-icon", className: "text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" }), _jsx(Input, { ref: ref, type: "search", value: value, onChange: (event) => onValueChange(event.target.value), "aria-label": "Search threads", placeholder: "Search threads", className: cn("h-8 ps-8 text-sm", className), ...props })] }));
});
ThreadListSearch.displayName = "ThreadListSearch";
export const ThreadListRoot = ({ className, ...props }) => {
    return (_jsx(ThreadListPrimitive.Root, { "data-slot": "aui_thread-list-root", className: cn("flex flex-col gap-0.5", className), ...props }));
};
export const ThreadListItems = ({ className, searchQuery = "", ...props }) => {
    return (_jsxs("div", { "data-slot": "aui_thread-list-items", className: cn("flex flex-col gap-0.5", className), ...props, children: [_jsx(AuiIf, { condition: (s) => s.threads.isLoading, children: _jsx(ThreadListSkeleton, {}) }), _jsx(AuiIf, { condition: (s) => !s.threads.isLoading, children: _jsx(ThreadListItemGroups, { searchQuery: searchQuery }) })] }));
};
const DAY_IN_MS = 86_400_000;
const dateGroupLabel = (date, startOfToday) => {
    if (!date || date.getTime() >= startOfToday)
        return "Today";
    if (date.getTime() >= startOfToday - DAY_IN_MS)
        return "Yesterday";
    return "Earlier";
};
const ThreadListItemGroups = ({ searchQuery = "", }) => {
    const threadIds = useAuiState((s) => s.threads.threadIds);
    const threadItems = useAuiState((s) => s.threads.threadItems);
    const query = searchQuery.trim().toLowerCase();
    const { filteredIndices, groups } = useMemo(() => {
        const itemsById = new Map(threadItems.map((item) => [item.id, item]));
        const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
        const filteredIndices = threadIds
            .map((id, index) => ({ id, index }))
            .filter(({ id }) => !query ||
            (itemsById.get(id)?.title || "New Chat")
                .toLowerCase()
                .includes(query))
            .map(({ index }) => index);
        if (!filteredIndices.some((index) => dates[index])) {
            return { filteredIndices, groups: null };
        }
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const time = (index) => dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const sorted = [...filteredIndices].sort((a, b) => time(b) - time(a));
        const result = [];
        for (const index of sorted) {
            const label = dateGroupLabel(dates[index], startOfToday);
            const lastGroup = result[result.length - 1];
            if (lastGroup?.label === label) {
                lastGroup.indices.push(index);
            }
            else {
                result.push({ label, indices: [index] });
            }
        }
        return { filteredIndices, groups: result };
    }, [threadIds, threadItems, query]);
    if (query && filteredIndices.length === 0) {
        return (_jsx("div", { "data-slot": "aui_thread-list-empty", className: "text-muted-foreground px-2.5 py-4 text-sm", children: "No threads found" }));
    }
    if (!groups) {
        return filteredIndices.map((index) => (_jsx(ThreadListPrimitive.ItemByIndex, { index: index, components: { ThreadListItem } }, threadIds[index])));
    }
    return groups.map((group) => (_jsxs(Fragment, { children: [_jsx("div", { "data-slot": "aui_thread-list-group-label", className: "text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium", children: group.label }), group.indices.map((index) => (_jsx(ThreadListPrimitive.ItemByIndex, { index: index, components: { ThreadListItem } }, threadIds[index])))] }, group.label)));
};
export const ThreadListNew = forwardRef(({ className, labelClassName, children, ...props }, ref) => {
    return (_jsx(ThreadListPrimitive.New, { asChild: true, children: _jsx(Button, { ref: ref, variant: "ghost", "data-slot": "aui_thread-list-new", className: cn("hover:bg-muted data-active:bg-muted h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(PlusIcon, { "data-slot": "aui_thread-list-new-icon", className: "size-4 shrink-0" }), _jsx("span", { "data-slot": "aui_thread-list-new-label", className: cn("whitespace-nowrap", labelClassName), children: "New Thread" })] })) }) }));
});
ThreadListNew.displayName = "ThreadListNew";
const ThreadListSkeleton = () => {
    return (_jsx("div", { className: "flex flex-col gap-0.5", children: Array.from({ length: 5 }, (_, i) => (_jsx("div", { role: "status", "aria-label": "Loading threads", "data-slot": "aui_thread-list-skeleton-wrapper", className: "flex h-8 items-center px-2.5", children: _jsx(Skeleton, { "data-slot": "aui_thread-list-skeleton", className: "h-3.5 w-full" }) }, i))) }));
};
export const ThreadListItem = () => {
    const isRunning = useAuiState((s) => s.threadListItem.isRunning);
    const [isRenaming, setIsRenaming] = useState(false);
    const triggerRef = useRef(null);
    const restoreFocusRef = useRef(false);
    useEffect(() => {
        if (isRenaming || !restoreFocusRef.current)
            return;
        restoreFocusRef.current = false;
        triggerRef.current?.focus();
    }, [isRenaming]);
    return (_jsxs(ThreadListItemPrimitive.Root, { "data-slot": "aui_thread-list-item", className: "group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex h-8 items-center rounded-md transition-colors focus-visible:outline-none", children: [isRenaming ? (_jsx(ThreadListItemRename, { onDone: (restoreFocus) => {
                    restoreFocusRef.current = restoreFocus;
                    setIsRenaming(false);
                } })) : (_jsxs(ThreadListItemPrimitive.Trigger, { ref: triggerRef, "data-slot": "aui_thread-list-item-trigger", className: "focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 group-data-active:pe-9 focus-visible:ring-[3px]", children: [isRunning && (_jsx(Loader2Icon, { "aria-hidden": true, "data-slot": "aui_thread-list-item-running", className: "text-muted-foreground me-1.5 size-3.5 shrink-0 animate-spin" })), _jsx("span", { "data-slot": "aui_thread-list-item-title", className: "min-w-0 flex-1 truncate", children: _jsx(ThreadListItemPrimitive.Title, { fallback: "New Chat" }) }), isRunning && _jsx("span", { className: "sr-only", children: "Running" })] })), _jsx(ThreadListItemMore, { onRename: () => setIsRenaming(true) })] }));
};
const ThreadListItemRename = ({ onDone }) => {
    const aui = useAui();
    const title = useAuiState((s) => s.threadListItem.title) ?? "";
    const [value, setValue] = useState(title);
    const inputRef = useRef(null);
    const settledRef = useRef(false);
    useEffect(() => {
        inputRef.current?.select();
    }, []);
    const commit = (restoreFocus) => {
        if (settledRef.current)
            return;
        settledRef.current = true;
        const next = value.trim();
        if (!next || next === title) {
            onDone(restoreFocus);
            return;
        }
        Promise.resolve()
            .then(() => aui.threadListItem.rename(next))
            .then(() => onDone(restoreFocus), () => {
            settledRef.current = false;
            if (restoreFocus)
                inputRef.current?.focus();
        });
    };
    const cancel = () => {
        if (settledRef.current)
            return;
        settledRef.current = true;
        onDone(true);
    };
    return (_jsx(Input, { ref: inputRef, autoFocus: true, "data-slot": "aui_thread-list-item-rename", "aria-label": "Rename thread", value: value, className: "h-7 min-w-0 flex-1 ps-2.5 pe-9 text-sm", onChange: (event) => setValue(event.target.value), onBlur: () => commit(false), onKeyDown: (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                commit(true);
            }
            else if (event.key === "Escape") {
                event.preventDefault();
                cancel();
            }
        } }));
};
const ThreadListItemMore = ({ onRename }) => {
    return (_jsxs(ThreadListItemMorePrimitive.Root, { sharedFocusGroup: true, children: [_jsx(ThreadListItemMorePrimitive.Trigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "icon", "data-slot": "aui_thread-list-item-more", className: "data-[state=open]:bg-accent absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100", children: [_jsx(MoreHorizontalIcon, { className: "size-3.5" }), _jsx("span", { className: "sr-only", children: "More options" })] }) }), _jsxs(ThreadListItemMorePrimitive.Content, { side: "right", align: "start", sideOffset: 6, "data-slot": "aui_thread-list-item-more-content", className: "bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm", children: [_jsxs(ThreadListItemMorePrimitive.Item, { "data-slot": "aui_thread-list-item-more-item", className: "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none", onSelect: onRename, children: [_jsx(PencilIcon, { className: "size-4" }), "Rename"] }), _jsx(ThreadListItemPrimitive.Archive, { asChild: true, children: _jsxs(ThreadListItemMorePrimitive.Item, { "data-slot": "aui_thread-list-item-more-item", className: "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none", children: [_jsx(ArchiveIcon, { className: "size-4" }), "Archive"] }) }), _jsx(ThreadListItemPrimitive.Delete, { asChild: true, children: _jsxs(ThreadListItemMorePrimitive.Item, { "data-slot": "aui_thread-list-item-more-item", className: "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none", children: [_jsx(TrashIcon, { className: "size-4" }), "Delete"] }) })] })] }));
};
//# sourceMappingURL=thread-list.js.map