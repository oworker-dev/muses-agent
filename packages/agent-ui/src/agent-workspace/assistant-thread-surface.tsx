"use client";

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  unstable_useMentionAdapter,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { LexicalComposerInput, type DirectiveChipProps } from "@assistant-ui/react-lexical";
import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AtSignIcon,
  CheckIcon,
  CopyIcon,
  LoaderCircleIcon,
  PencilIcon,
  SlashIcon,
  SquareIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { ComposerTriggerPopover } from "../assistant-ui/composer-trigger-popover.js";
import { ContextDisplay } from "../assistant-ui/context-display.js";
import { DirectiveText } from "../assistant-ui/directive-text.js";
import { MarkdownText } from "../assistant-ui/markdown-text.js";
import { ModelSelector, type ModelOption } from "../assistant-ui/model-selector.js";
import { ToolFallback } from "../assistant-ui/tool-fallback.js";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button.js";
import { Button } from "../ui/button.js";
import { AgentActivity } from "./agent-activity.js";
import { AgentMessage, type AgentInputResponse } from "./agent-message.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThreadPreferences } from "./contracts.js";
import type { AgentLocale, AgentMessages } from "./i18n.js";
import type { AgentUsageSummary } from "./usage.js";

export type AgentCancellationState = "idle" | "requested" | "cancelling";

export function AssistantThreadSurface({
  cancellationState,
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
  readonly cancellationState: AgentCancellationState;
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
    <ThreadPrimitive.Root
      className="aui-root flex h-full min-h-0 flex-col bg-background"
      style={{ "--thread-max-width": "48rem" } as React.CSSProperties}
    >
      <ThreadPrimitive.Viewport
        aria-live="polite"
        autoScroll
        turnAnchor="top"
        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pt-4"
        role="log"
      >
        <div className="mx-auto mb-14 flex w-full max-w-(--thread-max-width) flex-col gap-6 empty:hidden">
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
          {pendingTurnText ? <PendingUserTurn text={pendingTurnText} /> : null}
          {isBusy ? (
            <AgentActivity events={events} messages={messages} quietUntilSlow={quietActivity} />
          ) : null}
        </div>

        <ThreadPrimitive.Empty>
          {!pendingTurnText && !isBusy ? <AssistantEmptyState messages={messages} /> : null}
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col bg-background pb-4 pt-5 md:pb-6">
          <ThreadPrimitive.ScrollToBottom asChild>
            <TooltipIconButton
              tooltip={locale === "zh-CN" ? "滚动到底部" : "Scroll to bottom"}
              className="absolute -top-9 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full disabled:invisible"
              variant="outline"
            >
              <ArrowDownIcon className="size-4" />
            </TooltipIconButton>
          </ThreadPrimitive.ScrollToBottom>
          <AssistantComposer
            cancellationState={cancellationState}
            commands={commands}
            locale={locale}
            mentions={mentions}
            messages={messages}
            models={models}
            onPreferencesChange={onPreferencesChange}
            preferences={preferences}
            reasoningLevels={reasoningLevels}
            usage={usage}
          />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage({ messages }: { readonly messages: AgentMessages }) {
  const isLastUserMessage = useAuiState((state) => {
    const lastUser = [...state.thread.messages].reverse().find((message) => message.role === "user");
    return lastUser?.id === state.message.id;
  });

  return (
    <MessagePrimitive.Root className="group mx-auto flex w-full max-w-(--thread-max-width) flex-col items-end">
      <div className="max-w-[min(44rem,88%)] rounded-2xl bg-muted/75 px-4 py-3 text-[15px] leading-6 text-foreground">
        <MessagePrimitive.Parts components={{ Text: DirectiveText }} />
      </div>
      {isLastUserMessage ? (
        <ActionBarPrimitive.Root
          autohide="always"
          className="mt-0.5 flex min-h-7 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <ActionBarPrimitive.Edit
            aria-label={messages.editMessage}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PencilIcon className="size-3.5" />
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
      ) : null}
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
    <MessagePrimitive.Root className="group mx-auto flex w-full max-w-(--thread-max-width) flex-col">
      <div className="min-w-0 px-1 text-[15px] leading-7 text-foreground">
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
          <MessagePrimitive.Parts components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }} />
        )}
      </div>
      <ActionBarPrimitive.Root
        autohide="not-last"
        autohideFloat="single-branch"
        className="ml-0.5 flex min-h-7 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <ActionBarPrimitive.Copy
          aria-label={messages.copyResponse}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CopyIcon className="size-3.5" />
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function PendingUserTurn({ text }: { readonly text: string }) {
  return (
    <div className="flex w-full justify-end" data-optimistic="true">
      <div className="max-w-[min(44rem,88%)] rounded-2xl bg-muted/75 px-4 py-3 text-[15px] leading-6 text-foreground">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

function EditMessage({ messages }: { readonly messages: AgentMessages }) {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-(--thread-max-width)">
      <ComposerPrimitive.Root className="rounded-2xl bg-muted/75 px-4 py-3">
        <ComposerPrimitive.Input autoFocus className="min-h-16 w-full resize-none border-0 bg-transparent text-[15px] leading-6 outline-none" />
        <div className="mt-2 flex justify-end gap-1.5">
          <ComposerPrimitive.Cancel asChild>
            <Button size="sm" variant="ghost">{messages.cancelEdit}</Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm"><CheckIcon className="size-3.5" />{messages.saveAndResend}</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

export function AssistantComposer({
  cancellationState,
  commands,
  inputDisabled = false,
  locale,
  mentions,
  messages,
  models,
  onPreferencesChange,
  preferences,
  reasoningLevels,
  usage,
}: {
  readonly cancellationState: AgentCancellationState;
  readonly commands: readonly AgentPromptMenuItem[];
  readonly inputDisabled?: boolean;
  readonly locale: AgentLocale;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly onPreferencesChange: (preferences: AgentThreadPreferences) => void;
  readonly preferences: AgentThreadPreferences;
  readonly reasoningLevels: readonly string[];
  readonly usage: AgentUsageSummary;
}) {
  const aui = useAui();
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const composerIsEmpty = useAuiState((state) => state.composer.isEmpty);
  const runtimeInputDisabled = useAuiState((state) => state.thread.isDisabled);
  const stopping = cancellationState !== "idle";
  const composerDisabled = inputDisabled || runtimeInputDisabled || stopping;
  const composerInputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = composerInputRef.current?.querySelector<HTMLElement>('[role="textbox"]');
    if (!input) return;
    input.setAttribute("aria-label", messages.inputPlaceholder);
    input.setAttribute("aria-disabled", String(composerDisabled));
    input.setAttribute("contenteditable", String(!composerDisabled));
  }, [composerDisabled, messages.inputPlaceholder]);
  const mention = unstable_useMentionAdapter({
    fallbackIcon: AtSignIcon,
    includeModelContextTools: false,
    items: mentions.map((sourceItem) => {
      const item = localizePromptMenuItem(sourceItem, locale);
      return {
      description: item.description,
      id: item.value,
      label: item.label,
      type: "context",
      };
    }),
  });
  const command = unstable_useMentionAdapter({
    fallbackIcon: SlashIcon,
    includeModelContextTools: false,
    items: commands.map((sourceItem) => {
      const item = localizePromptMenuItem(sourceItem, locale);
      return {
      description: item.description,
      id: item.value,
      label: item.label,
      type: "command",
      };
    }),
  });
  const model = models.find((candidate) => candidate.id === preferences.modelId) ?? models[0];
  const selectorModels = useMemo<readonly ModelOption[]>(() => models.map((candidate) => ({
    efforts: reasoningLevels.map((level) => ({ id: level, name: formatReasoningLevel(level, locale) })),
    id: candidate.id,
    name: candidate.label,
  })), [models, reasoningLevels]);
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

  return (
    <ComposerPrimitive.Unstable_TriggerPopoverRoot>
      <ComposerPrimitive.Root
        className="relative flex w-full flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!composerDisabled) aui.composer.send();
        }}
      >
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-border/70 bg-background p-2 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.2)]">
          <LexicalComposerInput
            aria-disabled={composerDisabled}
            directiveChip={DirectiveChip}
            placeholder={`${messages.inputPlaceholder}  (@ /)`}
            ref={composerInputRef}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || composerDisabled || composerIsEmpty) return;
              event.preventDefault();
              aui.composer.send();
            }}
            className="aui-composer-input relative max-h-40 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-[15px] leading-6 outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_.aui-directive-chip]:inline-flex [&_.aui-directive-chip]:items-center [&_.aui-directive-chip]:gap-1 [&_.aui-directive-chip]:rounded-md [&_.aui-directive-chip]:bg-muted [&_.aui-directive-chip]:px-1.5 [&_.aui-directive-chip]:py-0.5 [&_.aui-directive-chip]:text-[13px] [&_.aui-directive-chip]:font-medium [&_.aui-directive-chip]:text-foreground [&_.aui-directive-chip-icon]:text-muted-foreground [&_.aui-lexical-input]:min-h-6 [&_.aui-lexical-input]:outline-none [&_.aui-lexical-placeholder]:pointer-events-none [&_.aui-lexical-placeholder]:absolute [&_.aui-lexical-placeholder]:inset-x-0 [&_.aui-lexical-placeholder]:top-0 [&_.aui-lexical-placeholder]:truncate [&_.aui-lexical-placeholder]:px-2 [&_.aui-lexical-placeholder]:py-1 [&_.aui-lexical-placeholder]:text-muted-foreground"
          />
          <div className="flex min-h-8 items-center gap-1">
            <ModelSelector
              align="start"
              className="h-8 max-w-56 rounded-full text-muted-foreground"
              contentClassName="w-72"
              effort={preferences.reasoning}
              effortLabel={messages.reasoning}
              models={selectorModels}
              onEffortChange={(reasoning) => onPreferencesChange({ ...preferences, reasoning })}
              onValueChange={(modelId) => onPreferencesChange({ ...preferences, modelId })}
              searchable={models.length > 6}
              size="sm"
              value={model?.id ?? preferences.modelId}
              variant="ghost"
              triggerLabel={messages.model}
            />
            <span className="ml-auto flex items-center gap-1">
              {model ? (
                <ContextDisplay.Ring
                  className="h-8 rounded-full px-1.5"
                  label={messages.context}
                  labels={contextLabels}
                  modelContextWindow={model.contextWindowTokens}
                  side="top"
                  usage={contextUsage}
                />
              ) : null}
              {stopping || (isRunning && composerIsEmpty) ? (
                <ComposerPrimitive.Cancel asChild>
                  <Button
                    aria-label={cancellationState === "idle" ? messages.cancel : messages.stopping}
                    className="size-8 rounded-full"
                    disabled={cancellationState !== "idle"}
                    size="icon-sm"
                    type="button"
                  >
                    {cancellationState === "idle" ? (
                      <SquareIcon className="size-3.5 fill-current" />
                    ) : (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    )}
                  </Button>
                </ComposerPrimitive.Cancel>
              ) : (
                <Button
                  aria-label={isRunning ? messages.queueFollowUp : messages.send}
                  className="size-8 rounded-full"
                  disabled={composerDisabled}
                  onClick={() => aui.composer.send()}
                  size="icon-sm"
                  type="button"
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
              )}
            </span>
          </div>
        </div>

        <ComposerTriggerPopover char="@" {...mention} emptyItemsLabel={messages.noPromptItems} />
        <ComposerTriggerPopover char="/" {...command} emptyItemsLabel={messages.noPromptItems} />
      </ComposerPrimitive.Root>
    </ComposerPrimitive.Unstable_TriggerPopoverRoot>
  );
}

function DirectiveChip({ directiveId, directiveType, label }: DirectiveChipProps) {
  const Icon = directiveType === "command" ? SlashIcon : AtSignIcon;
  return (
    <span className="aui-directive-chip" data-directive-id={directiveId} data-directive-type={directiveType}>
      <Icon className="aui-directive-chip-icon size-3" />
      <span>{label}</span>
    </span>
  );
}

function formatReasoningLevel(level: string, locale: AgentLocale): string {
  if (locale === "zh-CN") {
    if (level === "low") return "低";
    if (level === "medium") return "中";
    if (level === "high") return "高";
    if (level === "xhigh") return "极高";
  }
  if (level === "xhigh") return "X high";
  if (level === "medium") return "Med";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function localizePromptMenuItem(
  item: AgentPromptMenuItem,
  locale: AgentLocale,
): AgentPromptMenuItem {
  const translation = item.translations?.[locale];
  if (!translation) return item;
  return {
    ...item,
    description: translation.description ?? item.description,
    label: translation.label ?? item.label,
  };
}

function AssistantEmptyState({ messages }: { readonly messages: AgentMessages }) {
  const suggestions = [
    messages.suggestionInspect,
    messages.suggestionImplement,
    messages.suggestionResearch,
    messages.suggestionReview,
  ];
  const aui = useAui();

  return (
    <div className="mx-auto flex min-h-[min(30rem,62vh)] w-full max-w-(--thread-max-width) flex-1 flex-col items-center justify-center gap-6 px-2 pb-8 text-center">
      <WrenchIcon className="size-8 text-muted-foreground/60" />
      <h1 className="text-2xl font-medium tracking-normal text-foreground">{messages.emptyTitle}</h1>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            className="min-h-20 rounded-lg border border-border/70 px-3 py-3 text-left text-sm leading-5 transition-colors hover:bg-muted/50"
            key={suggestion}
            onClick={() => aui.composer.setText(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
