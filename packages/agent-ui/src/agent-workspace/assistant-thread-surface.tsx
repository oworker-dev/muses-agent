"use client";

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  unstable_useComposerInput,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  LoaderCircleIcon,
  PencilIcon,
  RefreshCwIcon,
  SendIcon,
  SquareIcon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button.js";
import { DiffViewer } from "../ui/diff-viewer.js";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.js";
import { ContextDisplay } from "../context-display.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentMessage, type AgentInputResponse } from "./agent-message.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThreadPreferences } from "./contracts.js";
import type { AgentLocale, AgentMessages } from "./i18n.js";
import { filterPromptMenuItems, findPromptTrigger, replacePromptTrigger } from "./prompt-menu.js";
import type { AgentUsageSummary } from "./usage.js";

export function AssistantThreadSurface({
  commands,
  events,
  eveMessages,
  fallbackStartedAt,
  isBusy,
  locale,
  mentions,
  messages,
  models,
  onInputResponses,
  onOpenSubagent,
  onPreferencesChange,
  pendingTurnText,
  preferences,
  quietActivity,
  reasoningLevels,
  usage,
}: {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly events: readonly HandleMessageStreamEvent[];
  readonly eveMessages: readonly EveMessage[];
  readonly fallbackStartedAt?: number;
  readonly isBusy: boolean;
  readonly locale: AgentLocale;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly onOpenSubagent?: (sessionId: string) => void;
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly pendingTurnText?: string;
  readonly preferences: AgentThreadPreferences;
  readonly quietActivity: boolean;
  readonly reasoningLevels: readonly string[];
  readonly usage: AgentUsageSummary;
}) {
  const eveMessagesById = useMemo(
    () => new Map(eveMessages.map((message) => [message.id, message])),
    [eveMessages],
  );
  const lastMessageId = eveMessages.at(-1)?.id;
  return (
    <ThreadPrimitive.Root className="aui-root flex h-full min-h-0 flex-col bg-background">
      <ThreadPrimitive.Viewport aria-live="polite" autoScroll turnAnchor="top" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4" role="log">
        <ThreadPrimitive.Messages>
          {({ message }) => message.composer.isEditing ? (
            <EditMessage messages={messages} />
          ) : message.role === "user" ? (
            <UserMessage messages={messages} />
          ) : (
            <AssistantMessage
              canRespond={!isBusy}
              events={events}
              fallbackStartedAt={fallbackStartedAt}
              isStreaming={isBusy && message.id === lastMessageId}
              locale={locale}
              message={eveMessagesById.get(message.id)}
              messages={messages}
              onInputResponses={onInputResponses}
              onOpenSubagent={onOpenSubagent}
            />
          )}
        </ThreadPrimitive.Messages>
        <ThreadPrimitive.Empty>
          {!pendingTurnText && !isBusy ? <AssistantEmptyState messages={messages} /> : null}
        </ThreadPrimitive.Empty>
        {pendingTurnText ? <PendingUserTurn text={pendingTurnText} /> : null}
        {isBusy ? (
          <div className="mx-auto w-full max-w-3xl py-2">
            <AgentActivity events={events} messages={messages} quietUntilSlow={quietActivity} />
          </div>
        ) : null}
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col gap-3 bg-background pb-4 pt-6 md:pb-6">
          <ThreadPrimitive.ScrollToBottom asChild>
            <Button aria-label={locale === "zh-CN" ? "滚动到底部" : "Scroll to bottom"} className="absolute -top-3 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full shadow-sm disabled:invisible" size="icon-sm" variant="outline"><ChevronDownIcon className="size-4" /></Button>
          </ThreadPrimitive.ScrollToBottom>
          <AssistantComposer commands={commands} mentions={mentions} messages={messages} models={models} onPreferencesChange={onPreferencesChange} preferences={preferences} reasoningLevels={reasoningLevels} usage={usage} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage({ messages }: { readonly messages: AgentMessages }) {
  return (
    <MessagePrimitive.Root className="group relative mx-auto flex w-full max-w-3xl justify-end py-1">
      <div className="max-w-[min(44rem,88%)] rounded-2xl bg-muted px-4 py-3 text-[15px] leading-6 text-foreground">
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root autohide="always" autohideFloat="always" className="absolute right-0 top-full z-10 mt-1 flex gap-0.5 rounded-lg border border-border/60 bg-background/95 p-0.5 shadow-sm">
        <ActionBarPrimitive.Edit aria-label={messages.editMessage} className="size-7 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><PencilIcon className="size-3.5" /></ActionBarPrimitive.Edit>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage({
  canRespond,
  events,
  fallbackStartedAt,
  isStreaming,
  locale,
  message,
  messages,
  onInputResponses,
  onOpenSubagent,
}: {
  readonly canRespond: boolean;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly fallbackStartedAt?: number;
  readonly isStreaming: boolean;
  readonly locale: AgentLocale;
  readonly message?: EveMessage;
  readonly messages: AgentMessages;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly onOpenSubagent?: (sessionId: string) => void;
}) {
  return (
    <MessagePrimitive.Root className="group relative mx-auto flex w-full max-w-3xl flex-col gap-2 py-1">
      <div className="min-w-0 text-[15px] leading-7 text-foreground">
        {message ? (
          <AgentMessage
            canRespond={canRespond}
            events={events}
            fallbackStartedAt={fallbackStartedAt}
            isStreaming={isStreaming}
            locale={locale}
            message={message}
            onInputResponses={onInputResponses}
            onOpenSubagent={onOpenSubagent}
            showCopyAction={false}
          />
        ) : (
          <MessagePrimitive.Parts components={{ tools: { Fallback: (props) => <AssistantTool {...props} uiMessages={messages} /> } }} />
        )}
      </div>
      <ActionBarPrimitive.Root autohide="not-last" autohideFloat="single-branch" className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <ActionBarPrimitive.Copy aria-label={messages.copyResponse} className="size-7 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><CopyIcon className="size-3.5" /></ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload aria-label={messages.regenerate} className="size-7 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCwIcon className="size-3.5" /></ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function PendingUserTurn({ text }: { readonly text: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl justify-end py-1" data-optimistic="true">
      <div className="max-w-[min(44rem,88%)] rounded-2xl bg-muted px-4 py-3 text-[15px] leading-6 text-foreground">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

function EditMessage({ messages }: { readonly messages: AgentMessages }) {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-3xl py-1">
      <ComposerPrimitive.Root className="rounded-2xl border border-border bg-background p-3 shadow-sm">
        <ComposerPrimitive.Input autoFocus className="min-h-20 w-full resize-none border-0 bg-transparent text-[15px] leading-6 outline-none" />
        <div className="mt-2 flex justify-end gap-2"><ComposerPrimitive.Cancel asChild><Button size="sm" variant="ghost">{messages.cancelEdit}</Button></ComposerPrimitive.Cancel><ComposerPrimitive.Send asChild><Button size="sm"><CheckIcon className="size-3.5" />{messages.saveAndResend}</Button></ComposerPrimitive.Send></div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function AssistantComposer({
  commands,
  mentions,
  messages,
  models,
  onPreferencesChange,
  preferences,
  reasoningLevels,
  usage,
}: {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly preferences: AgentThreadPreferences;
  readonly reasoningLevels: readonly string[];
  readonly usage: AgentUsageSummary;
}) {
  const composer = unstable_useComposerInput();
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [openMenu, setOpenMenu] = useState<"model" | "reasoning">();
  const model = models.find((candidate) => candidate.id === preferences.modelId) ?? models[0];
  const trigger = findPromptTrigger(composer.value);
  const sourceItems = trigger?.kind === "command" ? commands : mentions;
  const contextLabels = {
    cachedInput: messages.cacheReadTokens,
    contextUsage: messages.contextUsage,
    input: messages.inputTokens,
    of: messages.tokenUsageOf,
    output: messages.outputTokens,
    reasoning: messages.reasoning,
  };
  const contextUsage = {
    cachedInputTokens: usage.cacheReadTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: 0,
    totalTokens: usage.contextInputTokens,
  };
  const promptItems = useMemo(
    () => trigger ? filterPromptMenuItems(sourceItems, trigger.query) : [],
    [sourceItems, trigger],
  );
  return (
    <ComposerPrimitive.Root className="relative rounded-2xl border border-border/80 bg-background px-3 py-2 shadow-[0_10px_36px_-24px_rgba(15,23,42,0.45)] focus-within:border-border">
      {trigger && promptItems.length > 0 ? (
        <div className="absolute inset-x-2 bottom-[calc(100%+0.5rem)] z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{trigger.kind === "command" ? messages.skillsAndCommands : messages.contextItems}</p>
          {promptItems.map((item) => (
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent" key={item.id} onClick={() => composer.setText(replacePromptTrigger(composer.value, trigger, item.value))} type="button">
              <span className="size-5 shrink-0 rounded-md bg-muted text-center text-xs leading-5 text-muted-foreground">{trigger.kind === "command" ? "/" : "@"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.label}</span>{item.description ? <span className="block truncate text-xs text-muted-foreground">{item.description}</span> : null}</span>
              <span className="font-mono text-xs text-muted-foreground">{item.value}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ComposerPrimitive.Input
        aria-label={messages.inputPlaceholder}
        className="min-h-14 max-h-40 w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        onKeyDown={(event) => {
          if (event.key !== "Tab" || !trigger || !promptItems[0]) return;
          event.preventDefault();
          composer.setText(replacePromptTrigger(composer.value, trigger, promptItems[0].value));
        }}
        placeholder={messages.inputPlaceholder}
      />
      <div className="flex min-h-8 items-center gap-2">
        <span className="ml-auto flex items-center gap-2">
          <PreferenceSelect
            label={messages.model}
            onChange={(value) => onPreferencesChange({ ...preferences, modelId: value })}
            options={models.map((candidate) => ({ id: candidate.id, label: candidate.label }))}
            open={openMenu === "model"}
            onOpenChange={(open) => setOpenMenu(open ? "model" : undefined)}
            value={model?.id ?? preferences.modelId}
          />
          <PreferenceSelect
            label={messages.reasoning}
            onChange={(value) => onPreferencesChange({ ...preferences, reasoning: value })}
            options={reasoningLevels.map((level) => ({ id: level, label: level }))}
            open={openMenu === "reasoning"}
            onOpenChange={(open) => setOpenMenu(open ? "reasoning" : undefined)}
            value={preferences.reasoning}
          />
          {model ? (
            <>
              <ContextDisplay.Ring
                className="px-1 sm:hidden"
                label={messages.context}
                labels={contextLabels}
                modelContextWindow={model.contextWindowTokens}
                side="top"
                usage={contextUsage}
              />
              <ContextDisplay.Bar
                className="hidden sm:inline-flex"
                label={messages.context}
                labels={contextLabels}
                modelContextWindow={model.contextWindowTokens}
                side="top"
                usage={contextUsage}
              />
            </>
          ) : null}
          {isRunning ? (
            <>
              <ComposerPrimitive.Send asChild><Button aria-label={messages.queueFollowUp} className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90" size="icon-sm"><SendIcon className="size-4" /></Button></ComposerPrimitive.Send>
              <ComposerPrimitive.Cancel asChild><Button aria-label={messages.cancel} className="size-8 rounded-full" size="icon-sm" variant="ghost"><SquareIcon className="size-3.5 fill-current" /></Button></ComposerPrimitive.Cancel>
            </>
          ) : (
            <ComposerPrimitive.Send asChild><Button aria-label={messages.send} className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90" size="icon-sm"><SendIcon className="size-4" /></Button></ComposerPrimitive.Send>
          )}
        </span>
      </div>
    </ComposerPrimitive.Root>
  );
}

function PreferenceSelect({
  label,
  onChange,
  onOpenChange,
  open,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly value: string;
}) {
  const selected = options.find((option) => option.id === value) ?? options[0];
  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button aria-label={label} className="h-8 max-w-36 gap-1 rounded-full px-2 text-xs text-muted-foreground" size="sm" type="button" variant="ghost">
          <span className="max-w-28 truncate">{selected?.label ?? value}</span>
          <ChevronDownIcon className="size-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5" side="top" sideOffset={8}>
        <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="grid gap-0.5">
          {options.map((option) => (
            <button className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent" key={option.id} onClick={() => { onChange(option.id); onOpenChange(false); }} type="button">
              <span className="truncate">{option.label}</span>
              {option.id === value ? <CheckIcon className="size-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AssistantEmptyState({ messages }: { readonly messages: AgentMessages }) {
  const { setText } = unstable_useComposerInput();
  const suggestions = [messages.suggestionImplement, messages.suggestionInspect, messages.suggestionResearch, messages.suggestionReview];
  return (
    <div className="flex min-h-[min(28rem,60vh)] flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"><WrenchIcon className="size-5 text-muted-foreground" /></div>
      <div><h1 className="text-2xl font-medium tracking-normal text-foreground">{messages.emptyTitle}</h1><p className="mt-1 text-sm text-muted-foreground">{messages.emptyDescription}</p></div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => <button className="rounded-xl border border-border/70 bg-card px-3 py-3 text-left text-sm leading-5 transition-colors hover:border-border hover:bg-accent" key={suggestion} onClick={() => setText(suggestion)} type="button">{suggestion}</button>)}
      </div>
    </div>
  );
}

function AssistantTool(props: ToolCallMessagePartProps & { readonly uiMessages: AgentMessages }) {
  const running = props.status.type === "running";
  const label = toolLabel(props.toolName);
  const args = asRecord(props.args);
  const command = typeof args?.command === "string" ? args.command : typeof args?.cmd === "string" ? args.cmd : undefined;
  const patch = typeof args?.patch === "string" ? args.patch : typeof args?.diff === "string" ? args.diff : undefined;
  const taskItems = Array.isArray(args?.items) ? args.items : undefined;
  return (
    <div className="my-2 flex min-w-0 items-start gap-2 border-b border-border/60 py-2 text-sm last:border-b-0">
      {running ? <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" /> : <WrenchIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-medium">{label}</span>{running ? <span className="text-xs text-muted-foreground">{props.uiMessages.toolRunning}</span> : props.isError ? <span className="text-xs text-destructive">{props.uiMessages.toolFailed}</span> : <span className="text-xs text-muted-foreground">{props.uiMessages.toolCompleted}</span>}</div>
        {command ? <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-100">$ {command}</pre> : null}
        {patch ? <div className="mt-2 max-h-72 overflow-auto"><DiffViewer patch={patch} size="sm" showIcon={false} /></div> : null}
        {taskItems ? <div className="mt-2 space-y-1 rounded-lg bg-muted/50 px-3 py-2">{taskItems.map((item, index) => <div className="flex items-start gap-2 text-xs" key={index}><span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" /><span>{typeof item === "string" ? item : JSON.stringify(item)}</span></div>)}</div> : null}
        {!command && !patch && !taskItems ? <details className="mt-1"><summary className="cursor-pointer text-xs text-muted-foreground">{props.uiMessages.toolDetails}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-2 text-xs">{JSON.stringify(props.result ?? props.args, null, 2)}</pre></details> : null}
      </div>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function toolLabel(toolName: string): string {
  const labels: Record<string, string> = { bash: "Terminal", glob: "Find files", grep: "Search files", read_file: "Read file", write_file: "Edit file", apply_patch: "Apply patch", todo: "Task list", publish_preview: "Publish preview" };
  return labels[toolName.toLowerCase()] ?? toolName.replaceAll("_", " ");
}

export function AssistantText({ children }: { readonly children: ReactNode }) {
  return <p className="whitespace-pre-wrap break-words">{children}</p>;
}
