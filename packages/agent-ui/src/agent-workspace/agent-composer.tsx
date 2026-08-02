"use client";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
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
} from "../ai-elements/prompt-input.js";
import { FileIcon, GaugeIcon, PaperclipIcon, XIcon } from "lucide-react";
import type { AgentMessages } from "./i18n.js";
import type { AgentModelOption, AgentThreadPreferences } from "./contracts.js";
import type { AgentUsageSummary } from "./usage.js";
import { formatTokenCount } from "./usage.js";

export function AgentComposer({
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
  return (
    <PromptInput
      className="border-border/80 bg-card/95 shadow-[0_10px_35px_-22px_rgba(0,0,0,0.45)]"
      maxFileSize={10 * 1024 * 1024}
      multiple
      onSubmit={(message) => onSubmit(message)}
    >
      <PromptInputHeader>
        <ComposerAttachments messages={messages} />
      </PromptInputHeader>
      <PromptInputTextarea aria-label={messages.inputPlaceholder} placeholder={messages.inputPlaceholder} />
      <PromptInputFooter className="min-h-11">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger aria-label={messages.addFiles} tooltip={messages.addFiles}>
              <PaperclipIcon className="size-4" />
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments label={messages.addFiles} />
              <PromptInputActionAddScreenshot label={messages.takeScreenshot} />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <ModelSelect
            label={messages.model}
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
        </PromptInputTools>
        <div className="flex min-w-0 items-center gap-2 pr-1 text-muted-foreground text-xs">
          <span className="flex items-center gap-1" title={formatContextTitle(messages.context, models, preferences.modelId, usage.contextInputTokens)}>
            <GaugeIcon className="size-3.5" />
            <span>{formatContextUsage(models, preferences.modelId, usage.contextInputTokens)}</span>
          </span>
          <PromptInputSubmit
            aria-label={status === "ready" || status === "error" ? messages.send : messages.cancel}
            onStop={onStop}
            status={status}
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}

function ComposerAttachments({ messages }: { readonly messages: AgentMessages }) {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;

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

function ModelSelect({ label, models, onChange, value }: { readonly label: string; readonly models: readonly AgentModelOption[]; readonly onChange: (id: string) => void; readonly value: string }) {
  const selected = models.find((option) => option.id === value) ?? models[0];
  return (
    <PromptInputSelect onValueChange={(next) => { if (models.some((model) => model.id === next)) onChange(next); }} value={value}>
      <PromptInputSelectTrigger aria-label={label} className="h-8 max-w-36 px-2 text-xs">
        <PromptInputSelectValue>{selected.label}</PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent align="start">
        {models.map((option) => (
          <PromptInputSelectItem key={option.id} value={option.id}>
            {option.label}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}

function formatContextUsage(models: readonly AgentModelOption[], modelId: string, inputTokens: number): string {
  const model = models.find((option) => option.id === modelId) ?? models[0];
  return `${formatTokenCount(inputTokens)} / ${formatTokenCount(model.contextWindowTokens)}`;
}

function formatContextTitle(label: string, models: readonly AgentModelOption[], modelId: string, inputTokens: number): string {
  const model = models.find((option) => option.id === modelId) ?? models[0];
  const percentage = (inputTokens / model.contextWindowTokens) * 100;
  return `${label}: ${formatTokenCount(inputTokens)} / ${formatTokenCount(model.contextWindowTokens)} (${percentage.toFixed(1)}%)`;
}

function ReasoningSelect({ label, onChange, reasoningLevels, value }: { readonly label: string; readonly onChange: (level: string) => void; readonly reasoningLevels: readonly string[]; readonly value: string }) {
  return (
    <PromptInputSelect onValueChange={(next) => { if (reasoningLevels.includes(next)) onChange(next); }} value={value}>
      <PromptInputSelectTrigger aria-label={label} className="h-8 max-w-28 px-2 text-xs">
        <PromptInputSelectValue>{value}</PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent align="start">
        {reasoningLevels.map((level) => (
          <PromptInputSelectItem key={level} value={level}>
            {level}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}
