"use client";

import type { LanguageModelUsage } from "ai";
import {
  AtSignIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  FileIcon,
  PlusIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentHeader,
  ContextTrigger,
} from "../ai-elements/context.js";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "../ai-elements/model-selector.js";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
  usePromptInputController,
} from "../ai-elements/prompt-input.js";
import { Button } from "../ui/button.js";
import type { AgentMessages } from "./i18n.js";
import type {
  AgentModelOption,
  AgentExecutionMode,
  AgentPromptMenuItem,
  AgentThreadPreferences,
} from "./contracts.js";
import {
  filterPromptMenuItems,
  findPromptTrigger,
  replacePromptTrigger,
} from "./prompt-menu.js";
import type { AgentUsageSummary } from "./usage.js";
import { formatTokenCount } from "./usage.js";

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
  const attachments = usePromptInputAttachments();
  const executionMode = preferences.executionMode ?? "standard";

  return (
    <PromptInput
      className="relative overflow-visible border-border bg-card shadow-[0_12px_36px_-20px_rgba(0,0,0,0.28)]"
      maxFileSize={10 * 1024 * 1024}
      multiple
      onSubmit={(message) => {
        // Eve projects an optimistic user message immediately. Do not keep the
        // controlled composer populated for the lifetime of the remote turn.
        void onSubmit(message).catch(() => undefined);
      }}
    >
      {attachments.files.length > 0 ? (
        <PromptInputHeader>
          <ComposerAttachments messages={messages} />
        </PromptInputHeader>
      ) : null}
      <ComposerTextarea commands={commands} disabled={disabled || inputDisabled} mentions={mentions} messages={messages} />
      <PromptInputFooter className="min-h-10 gap-1.5 px-2.5 pb-2.5">
        <PromptInputTools className="min-w-0 flex-1 gap-0.5">
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger aria-label={messages.addFiles} tooltip={messages.addFiles}>
              <PlusIcon className="size-4" />
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent align="start" side="top">
              <PromptInputActionAddAttachments label={messages.addFiles} />
              <PromptInputActionAddScreenshot label={messages.takeScreenshot} />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <ExecutionModeSelect
            label={messages.executionMode}
            onChange={(nextMode) => onPreferencesChange({ ...preferences, executionMode: nextMode })}
            value={executionMode}
          />
        </PromptInputTools>
        <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-0.5">
          <ModelSelect
            label={messages.model}
            messages={messages}
            models={models}
            onChange={(modelId) => onPreferencesChange({ ...preferences, modelId })}
            value={preferences.modelId}
          />
          <ReasoningSelect
            label={messages.reasoning}
            onChange={(reasoning) => onPreferencesChange({ ...preferences, reasoning })}
            reasoningLevels={reasoningLevels}
            value={preferences.reasoning}
          />
          <ContextUsage messages={messages} models={models} modelId={preferences.modelId} usage={usage} />
          <PromptInputSubmit
            aria-label={status === "ready" || status === "error" ? messages.send : messages.cancel}
            className="static size-8"
            disabled={disabled}
            onStop={onStop}
            status={status}
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}

function ComposerTextarea({
  commands,
  disabled,
  mentions,
  messages,
}: {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly disabled: boolean;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly messages: AgentMessages;
}) {
  const controller = usePromptInputController();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dismissedInput, setDismissedInput] = useState<string>();
  const trigger = findPromptTrigger(controller.textInput.value);
  const sourceItems = trigger?.kind === "command" ? commands : mentions;
  const items = useMemo(
    () => trigger ? filterPromptMenuItems(sourceItems, trigger.query) : [],
    [sourceItems, trigger],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isOpen = Boolean(trigger && controller.textInput.value !== dismissedInput && sourceItems.length > 0);

  useEffect(() => setSelectedIndex(0), [controller.textInput.value]);

  const choose = (item: AgentPromptMenuItem) => {
    if (!trigger) return;
    const next = replacePromptTrigger(controller.textInput.value, trigger, item.value);
    controller.textInput.setInput(next);
    setDismissedInput(next);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <>
      {isOpen ? (
        <div className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-md border bg-popover shadow-lg">
          <PromptInputCommand value={items[selectedIndex]?.id ?? ""}>
            <PromptInputCommandList className="max-h-64">
              <PromptInputCommandEmpty>{messages.noPromptItems}</PromptInputCommandEmpty>
              <PromptInputCommandGroup heading={trigger?.kind === "command" ? messages.skillsAndCommands : messages.contextItems}>
                {items.map((item, index) => (
                  <PromptInputCommandItem
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onSelect={() => choose(item)}
                    value={item.id}
                  >
                    {trigger?.kind === "command" ? <CommandIcon className="size-4" /> : <AtSignIcon className="size-4" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.description ? <span className="block truncate text-xs text-muted-foreground">{item.description}</span> : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.value}</span>
                  </PromptInputCommandItem>
                ))}
              </PromptInputCommandGroup>
            </PromptInputCommandList>
          </PromptInputCommand>
        </div>
      ) : null}
      <PromptInputTextarea
        aria-label={messages.inputPlaceholder}
        className="min-h-14 max-h-40 px-4 py-3 text-[15px] leading-6"
        disabled={disabled}
        onKeyDown={(event) => {
          if (!isOpen) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((current) => items.length === 0 ? 0 : (current + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((current) => items.length === 0 ? 0 : (current - 1 + items.length) % items.length);
          } else if ((event.key === "Enter" || event.key === "Tab") && items[selectedIndex]) {
            event.preventDefault();
            choose(items[selectedIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDismissedInput(controller.textInput.value);
          }
        }}
        placeholder={messages.inputPlaceholder}
        ref={textareaRef}
      />
    </>
  );
}

function ComposerAttachments({ messages }: { readonly messages: AgentMessages }) {
  const attachments = usePromptInputAttachments();
  return (
    <div className="flex max-w-full flex-wrap gap-1.5">
      {attachments.files.map((file) => (
        <span className="inline-flex max-w-52 items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs" key={file.id}>
          <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{file.filename ?? messages.attachment}</span>
          <button
            aria-label={`${messages.removeAttachment}: ${file.filename ?? messages.attachment}`}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => attachments.remove(file.id)}
            type="button"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

function ModelSelect({
  label,
  messages,
  models,
  onChange,
  value,
}: {
  readonly label: string;
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly onChange: (id: string) => void;
  readonly value: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((option) => option.id === value) ?? models[0];
  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button aria-label={label} className="h-8 max-w-36 gap-1 px-1.5 text-xs" type="button" variant="ghost">
          <span className="hidden truncate sm:inline">{selected.label}</span>
          <span className="truncate sm:hidden">{compactModelLabel(selected.label)}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="max-w-[calc(100%-2rem)] sm:max-w-md" title={label}>
        <ModelSelectorInput placeholder={messages.searchModels} />
        <ModelSelectorList>
          <ModelSelectorEmpty>{messages.noModels}</ModelSelectorEmpty>
          <ModelSelectorGroup heading={label}>
            {models.map((option) => (
              <ModelSelectorItem
                key={option.id}
                onSelect={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                value={`${option.label} ${option.id}`}
              >
                <ModelSelectorName>{option.label}</ModelSelectorName>
                {option.id === selected.id ? <CheckIcon className="size-4" /> : null}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

function ContextUsage({
  messages,
  models,
  modelId,
  usage,
}: {
  readonly messages: AgentMessages;
  readonly models: readonly AgentModelOption[];
  readonly modelId: string;
  readonly usage: AgentUsageSummary;
}) {
  const model = models.find((option) => option.id === modelId) ?? models[0];
  const languageUsage: LanguageModelUsage = {
    inputTokens: usage.inputTokens,
    inputTokenDetails: {
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      noCacheTokens: Math.max(0, usage.inputTokens - usage.cacheReadTokens),
    },
    outputTokens: usage.outputTokens,
    outputTokenDetails: { reasoningTokens: undefined, textTokens: usage.outputTokens },
    totalTokens: usage.inputTokens + usage.outputTokens,
  };
  return (
    <Context maxTokens={model.contextWindowTokens} modelId={modelId} usedTokens={usage.contextInputTokens} usage={languageUsage}>
      <ContextTrigger aria-label={messages.context} className="h-8 gap-1 px-1.5" />
      <ContextContent align="end" side="top">
        <ContextContentHeader />
        <ContextContentBody className="space-y-2">
          {usage.isEstimated ? <p className="text-xs text-muted-foreground">{messages.liveEstimate}</p> : null}
          <UsageRow label={messages.inputTokens} value={usage.inputTokens} />
          <UsageRow label={messages.outputTokens} value={usage.outputTokens} />
          <UsageRow label={messages.cacheReadTokens} value={usage.cacheReadTokens} />
          <UsageRow label={messages.cacheWriteTokens} value={usage.cacheWriteTokens} />
          {usage.costUsd > 0 ? <div className="flex justify-between gap-4 border-t pt-2 text-xs"><span className="text-muted-foreground">{messages.estimatedCost}</span><span>${usage.costUsd.toFixed(4)}</span></div> : null}
        </ContextContentBody>
      </ContextContent>
    </Context>
  );
}

function UsageRow({ label, value }: { readonly label: string; readonly value: number }) {
  return <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{formatTokenCount(value)}</span></div>;
}

function ReasoningSelect({ label, onChange, reasoningLevels, value }: { readonly label: string; readonly onChange: (level: string) => void; readonly reasoningLevels: readonly string[]; readonly value: string }) {
  return (
    <PromptInputSelect onValueChange={(next) => { if (reasoningLevels.includes(next)) onChange(next); }} value={value}>
      <PromptInputSelectTrigger aria-label={label} className="h-8 max-w-24 px-1.5 text-xs">
        <PromptInputSelectValue>{value}</PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent align="start" position="popper" side="top">
        {reasoningLevels.map((level) => (
          <PromptInputSelectItem key={level} value={level}>{level}</PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}

function ExecutionModeSelect({ label, onChange, value }: { readonly label: string; readonly onChange: (mode: AgentExecutionMode) => void; readonly value: AgentExecutionMode }) {
  const labels: Record<AgentExecutionMode, string> = {
    automation: "Auto",
    cautious: "Review",
    standard: "Standard",
  };
  return (
    <PromptInputSelect onValueChange={(next) => {
      if (next === "automation" || next === "cautious" || next === "standard") onChange(next);
    }} value={value}>
      <PromptInputSelectTrigger aria-label={label} className="h-8 w-8 gap-0 px-0 text-xs sm:w-auto sm:max-w-28 sm:gap-1 sm:px-1.5">
        <PromptInputSelectValue>
          <ShieldCheckIcon className="size-3.5" />
          <span className="hidden sm:inline">{labels[value]}</span>
        </PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent align="start" position="popper" side="top">
        <PromptInputSelectItem value="standard">Standard</PromptInputSelectItem>
        <PromptInputSelectItem value="cautious">Review</PromptInputSelectItem>
        <PromptInputSelectItem value="automation">Auto</PromptInputSelectItem>
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}

function compactModelLabel(label: string): string {
  return label.replace(/^GPT-/iu, "").replace(/^OpenAI\s+/iu, "");
}
