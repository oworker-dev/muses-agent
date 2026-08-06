"use client";

import type { LanguageModelUsage } from "ai";
import {
  AtSignIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  FileIcon,
  PaperclipIcon,
  SendIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import type { AgentMessages } from "./i18n.js";
import type {
  AgentModelOption,
  AgentExecutionMode,
  AgentPromptMenuItem,
  AgentThreadPreferences,
} from "./contracts.js";
import { filterPromptMenuItems, findPromptTrigger, replacePromptTrigger } from "./prompt-menu.js";
import type { AgentUsageSummary } from "./usage.js";
import { formatTokenCount } from "./usage.js";

export type PromptInputMessage = {
  readonly files: readonly {
    readonly filename?: string;
    readonly mediaType: string;
    readonly url: string;
  }[];
  readonly text: string;
};

export function AgentComposer({
  commands = [],
  disabled = false,
  inputDisabled = false,
  mentions = [],
  messages,
  models,
  onPreferencesChange,
  onSubmit,
  onStop,
  preferences,
  reasoningLevels,
  status,
  usage,
}: {
  readonly commands?: readonly AgentPromptMenuItem[];
  readonly disabled?: boolean;
  readonly inputDisabled?: boolean;
  readonly mentions?: readonly AgentPromptMenuItem[];
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly onSubmit: (message: PromptInputMessage) => Promise<void>;
  readonly onStop: () => void;
  readonly preferences: AgentThreadPreferences;
  readonly reasoningLevels: readonly string[];
  readonly status: "error" | "ready" | "streaming" | "submitted";
  readonly usage: AgentUsageSummary;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PromptInputMessage["files"]>([]);
  const [openMenu, setOpenMenu] = useState<"model" | "reasoning" | "execution" | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trigger = findPromptTrigger(text);
  const sourceItems = trigger?.kind === "command" ? commands : mentions;
  const items = useMemo(
    () => trigger ? filterPromptMenuItems(sourceItems, trigger.query) : [],
    [sourceItems, trigger],
  );
  const isRunning = status === "streaming" || status === "submitted";
  const selectedModel = models.find((model) => model.id === preferences.modelId) ?? models[0];

  const submit = async () => {
    const message = { files, text: text.trim() };
    if ((!message.text && files.length === 0) || disabled || inputDisabled) return;
    setText("");
    setFiles([]);
    await onSubmit(message);
  };

  return (
    <form
      className="relative rounded-2xl border border-border/80 bg-background px-3 py-2 shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] transition-colors focus-within:border-border"
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      {files.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((file, index) => (
            <span className="inline-flex max-w-52 items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs" key={`${file.filename ?? "file"}-${index}`}>
              <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.filename ?? messages.attachment}</span>
              <button aria-label={`${messages.removeAttachment}: ${file.filename ?? messages.attachment}`} className="text-muted-foreground hover:text-foreground" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><XIcon className="size-3" /></button>
            </span>
          ))}
        </div>
      ) : null}
      {trigger && items.length > 0 ? (
        <div className="absolute inset-x-2 bottom-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {trigger.kind === "command" ? messages.skillsAndCommands : messages.contextItems}
          </p>
          {items.map((item) => (
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent" key={item.id} onClick={() => setText(replacePromptTrigger(text, trigger, item.value))} type="button">
              {trigger.kind === "command" ? <CommandIcon className="size-4 text-muted-foreground" /> : <AtSignIcon className="size-4 text-muted-foreground" />}
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.label}</span>{item.description ? <span className="block truncate text-xs text-muted-foreground">{item.description}</span> : null}</span>
              <span className="font-mono text-xs text-muted-foreground">{item.value}</span>
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        aria-label={messages.inputPlaceholder}
        className="min-h-14 max-h-40 w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        disabled={disabled || inputDisabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
        }}
        placeholder={messages.inputPlaceholder}
        value={text}
      />
      <div className="flex min-h-8 items-center gap-1">
        <input
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          className="hidden"
          multiple
          onChange={(event) => {
            const next = Array.from(event.target.files ?? []).map((file) => ({ filename: file.name, mediaType: file.type || "application/octet-stream", url: URL.createObjectURL(file) }));
            setFiles((current) => [...current, ...next]);
            event.currentTarget.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
        <Button aria-label={messages.addFiles} className="size-8 rounded-full" onClick={() => fileInputRef.current?.click()} size="icon-sm" type="button" variant="ghost"><PaperclipIcon className="size-4" /></Button>
        <MenuSelect label={messages.executionMode} options={(["standard", "automation", "cautious"] as AgentExecutionMode[]).map((value) => ({ id: value, label: executionLabel(messages, value) }))} onChange={(id) => onPreferencesChange({ ...preferences, executionMode: id as AgentExecutionMode })} onOpenChange={() => setOpenMenu(openMenu === "execution" ? undefined : "execution")} open={openMenu === "execution"} value={preferences.executionMode ?? "standard"} />
        <span className="ml-auto flex items-center gap-0.5">
          <MenuSelect label={messages.model} options={models.map((model) => ({ id: model.id, label: model.label }))} onChange={(id) => onPreferencesChange({ ...preferences, modelId: id })} onOpenChange={() => setOpenMenu(openMenu === "model" ? undefined : "model")} open={openMenu === "model"} value={selectedModel?.id ?? preferences.modelId} />
          <MenuSelect label={messages.reasoning} options={reasoningLevels.map((level) => ({ id: level, label: level }))} onChange={(id) => onPreferencesChange({ ...preferences, reasoning: id })} onOpenChange={() => setOpenMenu(openMenu === "reasoning" ? undefined : "reasoning")} open={openMenu === "reasoning"} value={preferences.reasoning} />
          <ContextUsage model={selectedModel} messages={messages} usage={usage} />
          {isRunning ? (
            <>
              <Button
                aria-label={messages.queueFollowUp}
                className={cn("size-8 rounded-full", text.trim() ? "bg-foreground text-background hover:bg-foreground/90" : "")}
                disabled={disabled || inputDisabled || !text.trim()}
                size="icon-sm"
                type="submit"
                variant={text.trim() ? "default" : "ghost"}
              >
                <SendIcon className="size-4" />
              </Button>
              <Button aria-label={messages.cancel} className="size-8 rounded-full" onClick={onStop} size="icon-sm" type="button" variant="ghost"><SquareIcon className="size-3.5 fill-current" /></Button>
            </>
          ) : <Button aria-label={messages.send} className={cn("size-8 rounded-full", text.trim() || files.length > 0 ? "bg-foreground text-background hover:bg-foreground/90" : "")} disabled={disabled || inputDisabled} size="icon-sm" type="submit" variant={text.trim() || files.length > 0 ? "default" : "ghost"}><SendIcon className="size-4" /></Button>}
        </span>
      </div>
    </form>
  );
}

function MenuSelect({ label, options, onChange, onOpenChange, open, value }: { readonly label: string; readonly options: readonly { readonly id: string; readonly label: string }[]; readonly onChange: (value: string) => void; readonly onOpenChange: () => void; readonly open: boolean; readonly value: string }) {
  const selected = options.find((option) => option.id === value) ?? options[0];
  return (
    <div className="relative">
      <Button aria-label={label} className="h-8 max-w-32 gap-1 rounded-full px-2 text-xs" onClick={onOpenChange} size="sm" type="button" variant="ghost"><span className="max-w-24 truncate">{selected?.label ?? value}</span><ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" /></Button>
      {open ? <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 min-w-40 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">{options.map((option) => <button className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent", option.id === value && "bg-accent")} key={option.id} onClick={() => { onChange(option.id); onOpenChange(); }} type="button"><span className="truncate">{option.label}</span>{option.id === value ? <CheckIcon className="size-3.5" /> : null}</button>)}</div> : null}
    </div>
  );
}

function ContextUsage({ model, messages, usage }: { readonly model?: AgentModelOption; readonly messages: AgentMessages; readonly usage: AgentUsageSummary }) {
  const ratio = model ? Math.min(100, Math.round((usage.contextInputTokens / model.contextWindowTokens) * 100)) : 0;
  return <span className="hidden items-center gap-1 px-2 text-xs text-muted-foreground sm:flex" title={`${messages.contextWindow}: ${formatTokenCount(usage.contextInputTokens)} / ${formatTokenCount(model?.contextWindowTokens ?? 0)}`}><span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/60" style={{ width: `${ratio}%` }} /></span><span className="tabular-nums">{formatTokenCount(usage.contextInputTokens)}</span></span>;
}

function executionLabel(messages: AgentMessages, mode: AgentExecutionMode): string {
  if (mode === "automation") return messages.executionAutomation;
  if (mode === "cautious") return messages.executionCautious;
  return messages.executionStandard;
}

export function formatUsage(usage: LanguageModelUsage | undefined): string {
  if (!usage) return "";
  return [usage.inputTokens, usage.outputTokens].filter((value): value is number => typeof value === "number").map(formatTokenCount).join(" / ");
}
