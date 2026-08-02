"use client";

import { LoaderCircleIcon, SearchIcon, Settings2Icon, SparklesIcon, SquarePenIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { cn } from "../utils.js";
import type { AgentThread } from "./contracts.js";
import type { AgentLocale, AgentMessages } from "./i18n.js";

export function AgentSidebar({
  activeThreadId,
  deletingThreadIds,
  hostFooter,
  locale,
  messages,
  onClose,
  onDelete,
  onNew,
  onSelect,
  onSettings,
  open,
  threads,
}: {
  readonly activeThreadId: string | undefined;
  readonly deletingThreadIds: ReadonlySet<string>;
  readonly hostFooter?: React.ReactNode;
  readonly locale: AgentLocale;
  readonly messages: AgentMessages;
  readonly onClose: () => void;
  readonly onDelete: (threadId: string) => void;
  readonly onNew: () => void;
  readonly onSelect: (threadId: string) => void;
  readonly onSettings: () => void;
  readonly open: boolean;
  readonly threads: readonly AgentThread[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (normalizedQuery.length === 0) return threads;
    return threads.filter((thread) => thread.title.toLocaleLowerCase(locale).includes(normalizedQuery));
  }, [locale, query, threads]);

  return (
    <>
      <div className={cn("fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside aria-label={messages.threads} className={cn("fixed inset-y-0 left-0 z-40 w-[280px] shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-200 lg:static lg:z-auto lg:shadow-none", open ? "translate-x-0 lg:w-[280px]" : "-translate-x-full lg:w-0 lg:border-r-0")}>
        <div className="flex h-full min-w-[280px] flex-col">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background"><SparklesIcon className="size-4" /></span>
              <span className="truncate">Agent</span>
            </div>
            <Button aria-label={messages.closeNavigation} className="lg:hidden" onClick={onClose} size="icon-sm" variant="ghost"><XIcon className="size-4" /></Button>
          </div>
          <div className="space-y-1 px-3">
            <Button className="w-full justify-start gap-2" onClick={onNew} variant="secondary"><SquarePenIcon className="size-4" />{messages.newTask}</Button>
            {searchOpen ? (
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus className="h-9 bg-background pl-8 pr-8 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder={messages.searchPlaceholder} value={query} />
                <Button aria-label={messages.closeNavigation} className="absolute right-0.5 top-0.5" onClick={() => { setQuery(""); setSearchOpen(false); }} size="icon-sm" variant="ghost"><XIcon className="size-3.5" /></Button>
              </div>
            ) : (
              <Button className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setSearchOpen(true)} variant="ghost"><SearchIcon className="size-4" />{messages.search}</Button>
            )}
          </div>
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <p className="px-2 pb-2 text-muted-foreground text-sm font-medium">{messages.threads}</p>
            {threads.length === 0 ? <p className="px-2 text-muted-foreground text-sm">{messages.noThreads}</p> : null}
            {threads.length > 0 && filteredThreads.length === 0 ? <p className="px-2 text-muted-foreground text-sm">{messages.noSearchResults}</p> : null}
            <div className="space-y-0.5">
              {filteredThreads.map((thread) => (
                <div className="group flex items-center gap-1" key={thread.id}>
                  <button className={cn("min-w-0 flex-1 rounded-md px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent", thread.id === activeThreadId && "bg-sidebar-accent font-medium")} onClick={() => onSelect(thread.id)} type="button">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 shrink-0 rounded-full", thread.status === "error" ? "bg-destructive" : thread.status === "streaming" || thread.status === "submitted" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                      <span className="truncate">{thread.title}</span>
                    </span>
                    <span className="mt-1 block truncate pl-3.5 text-xs text-muted-foreground">{formatDate(thread.updatedAt, locale)}</span>
                  </button>
                  <Button aria-label={deletingThreadIds.has(thread.id) ? messages.deletingThread : messages.deleteThread} className="opacity-60 group-hover:opacity-100 sm:opacity-0" disabled={deletingThreadIds.has(thread.id)} onClick={() => onDelete(thread.id)} size="icon-sm" variant="ghost">{deletingThreadIds.has(thread.id) ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}</Button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t p-3">
            {hostFooter}
            <Button className="mt-1 w-full justify-start gap-2 text-muted-foreground" onClick={onSettings} variant="ghost"><Settings2Icon className="size-4" />{messages.settings}</Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function formatDate(timestamp: number, locale: AgentLocale): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", { month: "short", day: "numeric" }).format(date);
}
