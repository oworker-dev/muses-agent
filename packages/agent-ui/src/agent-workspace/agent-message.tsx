"use client";

import type {
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessagePart,
} from "eve/react";
import {
  CheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CirclePauseIcon,
  CircleStopIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  NetworkIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HandleMessageStreamEvent } from "eve/client";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "../ai-elements/message.js";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import type { AgentLocale } from "./i18n.js";
import {
  presentAgentTurn,
  presentSubagentCall,
  type AgentTurnPresentation,
  type AgentTurnStatus,
} from "./turn-presentation.js";

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

type EveFilePart = Extract<EveMessagePart, { type: "file" }>;

export function AgentMessage({
  canRespond,
  events,
  fallbackStartedAt,
  isStreaming,
  locale,
  message,
  onOpenSubagent,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly fallbackStartedAt?: number;
  readonly isStreaming: boolean;
  readonly locale: AgentLocale;
  readonly message: EveMessage;
  readonly onOpenSubagent?: (sessionId: string) => void;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const task = presentAgentTurn(message, events);
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );

  const responseText = task?.finalPart?.text ?? (task ? undefined : lastText(message.parts));

  return (
    <Message
      data-optimistic={message.metadata?.optimistic ? "true" : undefined}
      from={message.role}
    >
      <MessageContent>
        {task ? (
          <>
            <ExecutionGroup fallbackStartedAt={fallbackStartedAt} locale={locale} task={task}>
              {task.processParts.map((part, index) => (
                <AgentMessagePart
                  canRespond={canRespond}
                  events={events}
                  inActiveExecution={task.status === "running" || task.status === "waiting"}
                  key={partKey(part, index)}
                  locale={locale}
                  onInputResponses={onInputResponses}
                  onOpenSubagent={onOpenSubagent}
                  part={part}
                  showCaret={false}
                />
              ))}
              {task.proxiedInputParts.map((part) => (
                <div className="space-y-2" key={`proxied-input:${part.toolCallId}`}>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {localize(locale, "A delegated task needs your approval", "子代理任务需要你的批准")}
                  </p>
                  <AgentMessagePart
                    canRespond={canRespond}
                    events={events}
                    inActiveExecution
                    locale={locale}
                    onInputResponses={onInputResponses}
                    onOpenSubagent={onOpenSubagent}
                    part={part}
                    showCaret={false}
                  />
                </div>
              ))}
            </ExecutionGroup>
            {task.finalPart ? (
              <AgentMessagePart
                canRespond={canRespond}
                events={events}
                inActiveExecution={false}
                locale={locale}
                onInputResponses={onInputResponses}
                onOpenSubagent={onOpenSubagent}
                part={task.finalPart}
                showCaret={isStreaming && task.finalPart.state === "streaming"}
              />
            ) : null}
          </>
        ) : message.parts.map((part, index) => (
          <AgentMessagePart
            canRespond={canRespond}
            events={events}
            inActiveExecution={false}
            key={partKey(part, index)}
            locale={locale}
            onInputResponses={onInputResponses}
            onOpenSubagent={onOpenSubagent}
            part={part}
            showCaret={isStreaming && message.role === "assistant" && index === lastTextIndex}
          />
        ))}
      </MessageContent>
      {message.role === "assistant" && responseText && !isStreaming ? (
        <CopyResponseAction locale={locale} text={responseText} />
      ) : null}
    </Message>
  );
}

function AgentMessagePart({
  canRespond,
  events,
  inActiveExecution,
  locale,
  onOpenSubagent,
  onInputResponses,
  part,
  showCaret,
}: {
  readonly canRespond: boolean;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly inActiveExecution: boolean;
  readonly locale: AgentLocale;
  readonly onOpenSubagent?: (sessionId: string) => void;
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
        <Reasoning defaultOpen={part.state === "streaming"} isStreaming={part.state === "streaming"}>
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
          className="mb-0"
          defaultOpen={(inActiveExecution && part.state !== "output-available") || part.state === "approval-requested" || part.state === "approval-responded"}
        >
          <ToolHeader
            showStatus={part.state !== "output-available"}
            state={part.state}
            statusLabel={toolStatusLabel(locale, part.state)}
            title={toolTitle(locale, part)}
            toolName={part.toolName}
            type="dynamic-tool"
          />
          <ToolContent>
            {part.toolMetadata?.eve?.kind === "subagent-call" ? (
              <SubagentProgress events={events} locale={locale} onOpenSubagent={onOpenSubagent} part={part} />
            ) : null}
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

function SubagentProgress({
  events,
  locale,
  onOpenSubagent,
  part,
}: {
  readonly events: readonly HandleMessageStreamEvent[];
  readonly locale: AgentLocale;
  readonly onOpenSubagent?: (sessionId: string) => void;
  readonly part: EveDynamicToolPart;
}) {
  const presentation = presentSubagentCall(events, part.toolCallId);
  const elapsedSeconds = useElapsedSeconds(presentation.startedAt, presentation.endedAt);
  const isActive = presentation.status === "running" || presentation.status === "starting";
  const title = presentation.status === "completed"
    ? localize(locale, "Sub-agent finished and returned its result to the parent Agent", "子代理已完成，结果已返回父 Agent")
    : presentation.status === "cancelled"
      ? localize(locale, "Sub-agent stopped", "子代理已停止")
    : presentation.status === "failed"
      ? localize(locale, "Sub-agent failed and returned control to the parent Agent", "子代理执行失败，控制权已返回父 Agent")
      : presentation.status === "running" && elapsedSeconds >= 45
        ? localize(locale, "Sub-agent is still working; the parent Agent will resume automatically", "子代理仍在执行；完成后父 Agent 会自动继续")
        : presentation.status === "running"
          ? localize(locale, "Sub-agent is working independently", "子代理正在独立执行")
          : localize(locale, "Starting the delegated task", "正在启动委派任务");

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
        presentation.status === "failed"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/30",
      )}
      role={isActive ? "status" : undefined}
    >
      {isActive ? (
        <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : presentation.status === "completed" ? (
        <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
      ) : presentation.status === "cancelled" ? (
        <CircleStopIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : (
        <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <NetworkIcon className="mr-1 inline size-3" />
          {presentation.name === "agent"
            ? localize(locale, "Works in the parent Agent workspace.", "在父 Agent 的工作区中执行。")
            : localize(locale, "Runs in its own isolated workspace.", "在独立隔离的工作区中执行。")}
        </p>
        {presentation.childSessionId && onOpenSubagent ? (
          <Button
            className="mt-2 h-7 px-2 text-xs"
            onClick={() => onOpenSubagent(presentation.childSessionId!)}
            size="sm"
            variant="outline"
          >
            <NetworkIcon className="size-3.5" />
            {localize(
              locale,
              `Open ${presentation.name === "agent" ? "sub-agent" : presentation.name ?? "sub-agent"} session`,
              `打开${presentation.name && presentation.name !== "agent" ? ` ${presentation.name}` : "子代理"}会话`,
            )}
          </Button>
        ) : null}
      </div>
      {presentation.startedAt ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDuration(elapsedSeconds)}
        </span>
      ) : null}
    </div>
  );
}

function ExecutionGroup({
  children,
  fallbackStartedAt,
  locale,
  task,
}: {
  readonly children: React.ReactNode;
  readonly fallbackStartedAt?: number;
  readonly locale: AgentLocale;
  readonly task: AgentTurnPresentation;
}) {
  const isActive = task.status === "running" || task.status === "waiting";
  const [open, setOpen] = useState(isActive);
  const previousStatus = useRef(task.status);
  const startedAt = task.startedAt ?? fallbackStartedAt;
  const elapsedSeconds = useElapsedSeconds(startedAt, task.endedAt);

  useEffect(() => {
    const wasActive = previousStatus.current === "running" || previousStatus.current === "waiting";
    if (task.status === "waiting") setOpen(true);
    else if (wasActive && !isActive) setOpen(false);
    previousStatus.current = task.status;
  }, [isActive, task.status]);

  return (
    <Collapsible className="group/execution w-full" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          type="button"
        >
          {task.status === "running" ? (
            <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
          ) : task.status === "waiting" ? (
            <CirclePauseIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
          ) : task.status === "completed" ? (
            <CheckCircleIcon className="size-4 shrink-0" />
          ) : (
            <XCircleIcon className="size-4 shrink-0" />
          )}
          <span>{executionLabel(locale, task.status)}</span>
          {startedAt ? <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span> : null}
          <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]/execution:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
        <div className="mt-2 space-y-3 border-l border-border pl-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CopyResponseAction({ locale, text }: { readonly locale: AgentLocale; readonly text: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timeout.current), []);

  return (
    <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <MessageAction
        label={localize(locale, "Copy response", "复制回复")}
        onClick={() => {
          void copyText(text).then(() => {
            setCopied(true);
            window.clearTimeout(timeout.current);
            timeout.current = window.setTimeout(() => setCopied(false), 1_500);
          });
        }}
        tooltip={localize(locale, copied ? "Copied" : "Copy response", copied ? "已复制" : "复制回复")}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </MessageAction>
    </MessageActions>
  );
}

function useElapsedSeconds(startedAt: number | undefined, endedAt: number | undefined): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!startedAt || endedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [endedAt, startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1_000));
}

function executionLabel(locale: AgentLocale, status: AgentTurnStatus): string {
  if (status === "running") return localize(locale, "Working", "正在处理");
  if (status === "waiting") return localize(locale, "Waiting for approval", "等待批准");
  if (status === "completed") return localize(locale, "Worked for", "已处理");
  if (status === "cancelled") return localize(locale, "Stopped after", "已停止");
  return localize(locale, "Failed after", "执行失败");
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function lastText(parts: readonly EveMessagePart[]): string | undefined {
  const part = [...parts].reverse().find((candidate) => candidate.type === "text");
  return part?.type === "text" ? part.text : undefined;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable.");
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

function toolTitle(locale: AgentLocale, part: EveDynamicToolPart): string {
  const kind = part.toolMetadata?.eve?.kind;
  if (kind === "load-skill") return localize(locale, "Loaded skill", "加载技能");
  if (kind === "subagent-call") return localize(locale, "Sub-agent", "子代理");

  const normalized = part.toolName.toLocaleLowerCase().replaceAll("-", "_");
  if (["bash", "shell", "terminal"].includes(normalized)) return localize(locale, "Terminal command", "终端命令");
  if (["publish_preview", "website_preview"].includes(normalized)) return localize(locale, "Published preview", "发布网站预览");
  if (["read_file", "read", "view_file"].includes(normalized)) return localize(locale, "Read file", "读取文件");
  if (["write_file", "edit_file", "apply_patch"].includes(normalized)) return localize(locale, "Edited files", "编辑文件");
  if (["web_search", "search_web", "search"].includes(normalized)) return localize(locale, "Searched the web", "搜索网页");
  return part.toolName.replaceAll("_", " ");
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
