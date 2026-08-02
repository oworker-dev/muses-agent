"use client";

import type {
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessagePart,
} from "eve/react";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  KeyRoundIcon,
  XCircleIcon,
} from "lucide-react";
import { Message, MessageContent, MessageResponse } from "../ai-elements/message.js";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../ai-elements/reasoning.js";
import { Shimmer } from "../ai-elements/shimmer.js";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import type { AgentLocale } from "./i18n.js";

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

type EveFilePart = Extract<EveMessagePart, { type: "file" }>;

export function AgentMessage({
  canRespond,
  isStreaming,
  locale,
  message,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly isStreaming: boolean;
  readonly locale: AgentLocale;
  readonly message: EveMessage;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );

  return (
    <Message
      data-optimistic={message.metadata?.optimistic ? "true" : undefined}
      from={message.role}
    >
      <MessageContent>
        {message.parts.map((part, index) => (
          <AgentMessagePart
            canRespond={canRespond}
            key={partKey(part, index)}
            locale={locale}
            onInputResponses={onInputResponses}
            part={part}
            showCaret={isStreaming && message.role === "assistant" && index === lastTextIndex}
          />
        ))}
      </MessageContent>
    </Message>
  );
}

function AgentMessagePart({
  canRespond,
  locale,
  onInputResponses,
  part,
  showCaret,
}: {
  readonly canRespond: boolean;
  readonly locale: AgentLocale;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveMessagePart;
  readonly showCaret: boolean;
}) {
  switch (part.type) {
    case "step-start":
      return null;
    case "text":
      return (
        <MessageResponse caret="block" isAnimating={showCaret}>
          {part.text}
        </MessageResponse>
      );
    case "reasoning":
      return (
        <Reasoning defaultOpen isStreaming={part.state === "streaming"}>
          <ReasoningTrigger getThinkingMessage={(streaming, duration) => reasoningLabel(locale, streaming, duration)} />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "file":
      return <AttachmentPart locale={locale} part={part} />;
    case "authorization":
      return <AuthorizationPrompt locale={locale} part={part} />;
    case "dynamic-tool":
      return (
        <Tool
          defaultOpen={part.state === "approval-requested" || part.state === "approval-responded"}
        >
          <ToolHeader
            state={part.state}
            statusLabel={toolStatusLabel(locale, part.state)}
            title={part.toolName}
            toolName={part.toolName}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={part.input} label={localize(locale, "Parameters", "参数")} />
            <InputRequestActions
              canRespond={canRespond}
              locale={locale}
              part={part}
              onInputResponses={onInputResponses}
            />
            <ToolOutput errorLabel={localize(locale, "Error", "错误")} errorText={part.errorText} output={part.output} resultLabel={localize(locale, "Result", "结果")} />
          </ToolContent>
        </Tool>
      );
  }
}

function AttachmentPart({ locale, part }: { readonly locale: AgentLocale; readonly part: EveFilePart }) {
  const label = part.filename ?? localize(locale, "Attachment", "附件");
  const detail = [part.mediaType, formatBytes(part.size)].filter(Boolean).join(" - ");
  const isImage = part.mediaType.startsWith("image/") && part.url !== undefined;
  const Icon = isImage ? ImageIcon : FileIcon;
  const body = (
    <span className="flex max-w-sm items-center gap-3 rounded-md border bg-background/60 p-2 text-sm">
      {isImage ? (
        <img alt={label} className="size-12 shrink-0 rounded-sm object-cover" src={part.url} />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {detail ? <span className="block truncate text-muted-foreground">{detail}</span> : null}
      </span>
      {part.url ? <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return part.url ? (
    <a href={part.url} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    body
  );
}

function AuthorizationPrompt({ locale, part }: { readonly locale: AgentLocale; readonly part: EveAuthorizationPart }) {
  const isAuthorized = part.state === "completed" && part.outcome === "authorized";
  const isCompleted = part.state === "completed";
  const Icon = isAuthorized ? CheckCircleIcon : isCompleted ? XCircleIcon : KeyRoundIcon;
  const instructions = part.authorization?.instructions;
  const shouldShowInstructions = instructions !== undefined && instructions !== part.description;

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border p-3",
        isAuthorized
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isCompleted
            ? "border-destructive/30 bg-destructive/5"
            : "border-blue-500/30 bg-blue-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            isAuthorized
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : isCompleted
                ? "bg-destructive/10 text-destructive"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-sm">{authorizationTitle(part, locale)}</p>
          <p className="text-muted-foreground text-sm">{authorizationDescription(part, locale)}</p>
          {shouldShowInstructions ? (
            <p className="text-muted-foreground text-sm">{instructions}</p>
          ) : null}
          {part.state === "required" && part.authorization?.userCode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{localize(locale, "Code", "验证码")}</span>
              <code className="rounded-md bg-background px-2 py-1 font-mono">
                {part.authorization.userCode}
              </code>
            </div>
          ) : null}
          {part.state === "required" && part.authorization?.url ? (
            <Button asChild size="sm">
              <a href={part.authorization.url} rel="noreferrer" target="_blank">
                <ExternalLinkIcon className="size-4" />
                {localize(locale, `Sign in with ${part.displayName}`, `使用 ${part.displayName} 登录`)}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function authorizationTitle(part: EveAuthorizationPart, locale: AgentLocale): string {
  if (part.state === "required") {
    return localize(locale, `Connect ${part.displayName}`, `连接 ${part.displayName}`);
  }
  if (part.outcome === "authorized") {
    return localize(locale, `${part.displayName} connected`, `${part.displayName} 已连接`);
  }
  return localize(locale, `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}`, `${part.displayName} 授权${formatAuthorizationOutcome(part.outcome, locale)}`);
}

function authorizationDescription(part: EveAuthorizationPart, locale: AgentLocale): string {
  if (part.state === "required") {
    return part.description;
  }
  if (part.outcome === "authorized") {
    return localize(locale, `${part.displayName} connected.`, `${part.displayName} 已连接。`);
  }
  const tail = part.reason !== undefined ? ` (${part.reason})` : "";
  return localize(locale, `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}${tail}.`, `${part.displayName} 授权${formatAuthorizationOutcome(part.outcome, locale)}${tail}。`);
}

function formatAuthorizationOutcome(outcome: NonNullable<EveAuthorizationPart["outcome"]>, locale: AgentLocale = "en"): string {
  switch (outcome) {
    case "authorized":
      return localize(locale, "authorized", "成功");
    case "declined":
      return localize(locale, "declined", "已拒绝");
    case "failed":
      return localize(locale, "failed", "失败");
    case "timed-out":
      return localize(locale, "timed out", "已超时");
  }
}

function formatBytes(size: number | undefined): string | undefined {
  if (size === undefined) {
    return undefined;
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function InputRequestActions({
  canRespond,
  locale,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly locale: AgentLocale;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveDynamicToolPart;
}) {
  const inputRequest = part.toolMetadata?.eve?.inputRequest;
  if (!inputRequest) {
    return null;
  }

  const inputResponse = part.toolMetadata?.eve?.inputResponse;
  const selectedOption = inputRequest.options?.find(
    (option) => option.id === inputResponse?.optionId,
  );

  return (
    <div className="space-y-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
      <p className="text-muted-foreground text-sm">{inputRequest.prompt}</p>
      {inputResponse ? (
        <p className="font-medium text-sm">
          {localize(locale, "Responded", "已回复")}: {selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {inputRequest.options?.map((option) => (
            <Button
              disabled={!canRespond}
              key={option.id}
              onClick={() => {
                void onInputResponses([
                  {
                    optionId: option.id,
                    requestId: inputRequest.requestId,
                  },
                ]);
              }}
              size="sm"
              type="button"
              variant={option.style === "danger" ? "destructive" : "default"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function localize(locale: AgentLocale, english: string, chinese: string): string {
  return locale === "zh-CN" ? chinese : english;
}

function reasoningLabel(locale: AgentLocale, streaming: boolean, duration?: number) {
  if (streaming || duration === 0) {
    return <Shimmer duration={1}>{localize(locale, "Thinking...", "思考中…")}</Shimmer>;
  }
  if (duration === undefined) {
    return <p>{localize(locale, "Thought for a few seconds", "思考了几秒")}</p>;
  }
  return <p>{localize(locale, `Thought for ${duration} seconds`, `思考了 ${duration} 秒`)}</p>;
}

function toolStatusLabel(locale: AgentLocale, state: EveDynamicToolPart["state"]): string {
  switch (state) {
    case "approval-requested":
      return localize(locale, "Awaiting approval", "等待批准");
    case "approval-responded":
      return localize(locale, "Responded", "已回复");
    case "input-available":
      return localize(locale, "Running", "运行中");
    case "input-streaming":
      return localize(locale, "Pending", "准备中");
    case "output-available":
      return localize(locale, "Completed", "已完成");
    case "output-denied":
      return localize(locale, "Denied", "已拒绝");
    case "output-error":
      return localize(locale, "Error", "错误");
  }
}

function partKey(part: EveMessagePart, index: number): string {
  switch (part.type) {
    case "authorization":
      return `authorization:${part.turnId}:${part.stepIndex}:${part.name}`;
    case "dynamic-tool":
      return part.toolCallId;
    default:
      return `${part.type}:${index}`;
  }
}
