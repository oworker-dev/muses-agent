"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { LoaderCircleIcon, MoreHorizontalIcon, PencilIcon, SearchIcon, Settings2Icon, SparklesIcon, SquarePenIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "../ui/dropdown-menu.js";
import { cn } from "../utils.js";
export function AgentSidebar({ activeThreadId, deletingThreadIds, hostFooter, locale, messages, onClose, onDelete, onNew, onRename, onSelect, onSettings, open, threads, }) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [editingThreadId, setEditingThreadId] = useState();
    const [editingTitle, setEditingTitle] = useState("");
    const filteredThreads = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase(locale);
        if (normalizedQuery.length === 0)
            return threads;
        return threads.filter((thread) => thread.title.toLocaleLowerCase(locale).includes(normalizedQuery));
    }, [locale, query, threads]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: cn("fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden", open ? "block" : "hidden"), onClick: onClose }), _jsx("aside", { "aria-label": messages.threads, className: cn("fixed inset-y-0 left-0 z-40 w-[280px] shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-200 lg:static lg:z-auto lg:shadow-none", open ? "translate-x-0 lg:w-[280px]" : "-translate-x-full lg:w-0 lg:border-r-0"), children: _jsxs("div", { className: "flex h-full min-w-[280px] flex-col", children: [_jsxs("div", { className: "flex h-14 items-center justify-between px-4", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2 font-semibold", children: [_jsx("span", { className: "flex size-7 items-center justify-center rounded-lg bg-foreground text-background", children: _jsx(SparklesIcon, { className: "size-4" }) }), _jsx("span", { className: "truncate", children: "Agent" })] }), _jsx(Button, { "aria-label": messages.closeNavigation, className: "lg:hidden", onClick: onClose, size: "icon-sm", variant: "ghost", children: _jsx(XIcon, { className: "size-4" }) })] }), _jsxs("div", { className: "space-y-1 px-3", children: [_jsxs(Button, { className: "w-full justify-start gap-2", onClick: onNew, variant: "secondary", children: [_jsx(SquarePenIcon, { className: "size-4" }), messages.newTask] }), searchOpen ? (_jsxs("div", { className: "relative", children: [_jsx(SearchIcon, { className: "absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { autoFocus: true, className: "h-9 bg-background pl-8 pr-8 text-sm", onChange: (event) => setQuery(event.target.value), placeholder: messages.searchPlaceholder, value: query }), _jsx(Button, { "aria-label": messages.closeNavigation, className: "absolute right-0.5 top-0.5", onClick: () => { setQuery(""); setSearchOpen(false); }, size: "icon-sm", variant: "ghost", children: _jsx(XIcon, { className: "size-3.5" }) })] })) : (_jsxs(Button, { className: "w-full justify-start gap-2 text-muted-foreground", onClick: () => setSearchOpen(true), variant: "ghost", children: [_jsx(SearchIcon, { className: "size-4" }), messages.search] }))] }), _jsxs("div", { className: "mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-4", children: [_jsx("p", { className: "px-2 pb-2 text-muted-foreground text-sm font-medium", children: messages.threads }), threads.length === 0 ? _jsx("p", { className: "px-2 text-muted-foreground text-sm", children: messages.noThreads }) : null, threads.length > 0 && filteredThreads.length === 0 ? _jsx("p", { className: "px-2 text-muted-foreground text-sm", children: messages.noSearchResults }) : null, _jsx("div", { className: "space-y-0.5", children: filteredThreads.map((thread) => (_jsxs("div", { className: cn("group flex items-center gap-1 rounded-md", thread.id === activeThreadId && "bg-sidebar-accent shadow-sm ring-1 ring-sidebar-border"), children: [editingThreadId === thread.id ? (_jsx(Input, { "aria-label": messages.renameThread, autoFocus: true, className: "m-1 h-9 min-w-0 flex-1 bg-background text-sm", onBlur: () => {
                                                    onRename(thread.id, editingTitle);
                                                    setEditingThreadId(undefined);
                                                }, onChange: (event) => setEditingTitle(event.target.value), onKeyDown: (event) => {
                                                    if (event.key === "Enter")
                                                        event.currentTarget.blur();
                                                    if (event.key === "Escape") {
                                                        setEditingThreadId(undefined);
                                                        setEditingTitle("");
                                                    }
                                                }, value: editingTitle })) : _jsxs("button", { "aria-current": thread.id === activeThreadId ? "page" : undefined, className: cn("min-w-0 flex-1 border-l-2 border-transparent px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent", thread.id === activeThreadId && "border-l-foreground font-semibold text-foreground"), onClick: () => onSelect(thread.id), onDoubleClick: () => {
                                                    setEditingThreadId(thread.id);
                                                    setEditingTitle(thread.title);
                                                }, type: "button", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn("size-1.5 shrink-0 rounded-full", thread.status === "error" ? "bg-destructive" : thread.status === "streaming" || thread.status === "submitted" ? "bg-emerald-500" : "bg-muted-foreground/30") }), _jsx("span", { className: "truncate", children: thread.title })] }), _jsx("span", { className: "mt-1 block truncate pl-3.5 text-xs text-muted-foreground", children: formatDate(thread.updatedAt, locale) })] }), editingThreadId !== thread.id ? (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { "aria-label": messages.threadActions, className: "mr-1 opacity-70 group-hover:opacity-100 sm:opacity-0", disabled: deletingThreadIds.has(thread.id), size: "icon-sm", variant: "ghost", children: deletingThreadIds.has(thread.id) ? _jsx(LoaderCircleIcon, { className: "size-3.5 animate-spin" }) : _jsx(MoreHorizontalIcon, { className: "size-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsxs(DropdownMenuItem, { onSelect: () => {
                                                                    setEditingThreadId(thread.id);
                                                                    setEditingTitle(thread.title);
                                                                }, children: [_jsx(PencilIcon, { className: "size-4" }), messages.renameThread] }), _jsxs(DropdownMenuItem, { className: "text-destructive focus:text-destructive", onSelect: () => onDelete(thread.id), children: [_jsx(Trash2Icon, { className: "size-4" }), messages.deleteThread] })] })] })) : null] }, thread.id))) })] }), _jsxs("div", { className: "border-t p-3", children: [hostFooter, _jsxs(Button, { className: "mt-1 w-full justify-start gap-2 text-muted-foreground", onClick: onSettings, variant: "ghost", children: [_jsx(Settings2Icon, { className: "size-4" }), messages.settings] })] })] }) })] }));
}
function formatDate(timestamp, locale) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", { month: "short", day: "numeric" }).format(date);
}
//# sourceMappingURL=agent-sidebar.js.map