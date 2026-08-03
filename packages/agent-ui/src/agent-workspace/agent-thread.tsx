"use client";

import type { UserContent } from "ai";
import type { HandleMessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, ArrowDownIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation.js";
import { PromptInputProvider, type PromptInputMessage } from "../ai-elements/prompt-input.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import { AgentComposer } from "./agent-composer.js";
import { createAgentSession } from "./agent-client.js";
import { AgentMessage, type AgentInputResponse } from "./agent-message.js";
import type { AgentModelOption, AgentPromptMenuItem, AgentThread, AgentThreadPatch, AgentWorkspaceClientConfig } from "./contracts.js";
import { messagesFor, type AgentLocale, type AgentMessages } from "./i18n.js";
import { titleFromPrompt } from "./thread-storage.js";
import { summarizeUsage } from "./usage.js";

type Cancellation = {
  requested: boolean;
  sentTurnId?: string;
  turnId?: string;
};

export function AgentThreadView({
  client,
  commands,
  locale,
  mentions,
  models,
  onChange,
  onEvent,
  providerReady,
  reasoningLevels,
  thread,
}: {
  readonly client?: AgentWorkspaceClientConfig;
  readonly commands: readonly AgentPromptMenuItem[];
  readonly locale: AgentLocale;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly models: readonly AgentModelOption[];
  readonly onChange: (patch: AgentThreadPatch) => void;
  readonly onEvent?: (event: HandleMessageStreamEvent) => void;
  readonly providerReady: boolean;
  readonly reasoningLevels: readonly string[];
  readonly thread: AgentThread;
}) {
  const preferencesRef = useRef(thread.preferences);
  const cancellationRef = useRef<Cancellation>({ requested: false });
  const [cancellationState, setCancellationState] = useState<"idle" | "requested" | "cancelling">("idle");
  const [cancellationError, setCancellationError] = useState<string>();
  const [turnError, setTurnError] = useState<string | undefined>(() => latestTurnFailure(thread.events));
  const messages = messagesFor(locale);

  useEffect(() => {
    preferencesRef.current = thread.preferences;
  }, [thread.preferences]);

  const [session] = useState(() =>
    createAgentSession(client, () => preferencesRef.current, thread.session),
  );

  const cancelTurn = useCallback(
    (turnId: string) => {
      const cancellation = cancellationRef.current;
      if (!cancellation.requested || cancellation.sentTurnId === turnId) return;
      cancellation.sentTurnId = turnId;
      setCancellationState("cancelling");
      void session.cancel({ turnId }).catch((error: unknown) => {
        cancellation.requested = false;
        cancellation.sentTurnId = undefined;
        setCancellationError(error instanceof Error ? error.message : "Unable to stop this turn.");
        setCancellationState("idle");
      });
    },
    [session],
  );

  const handleEvent = useCallback(
    (event: HandleMessageStreamEvent) => {
      if (event.type === "turn.started") {
        cancellationRef.current.turnId = event.data.turnId;
        cancelTurn(event.data.turnId);
      }
      if (event.type === "step.failed" || event.type === "turn.failed" || event.type === "session.failed") {
        setTurnError(event.data.message);
      }
      if (event.type === "turn.completed" || event.type === "turn.cancelled") {
        setTurnError(undefined);
      }
      onEvent?.(event);
    },
    [cancelTurn, onEvent],
  );

  const agent = useEveAgent({
    initialEvents: thread.events,
    initialSession: thread.session,
    onEvent: handleEvent,
    onSessionChange: (nextSession) => onChange({ session: nextSession }),
    prepareSend: client?.prepareSend,
    session,
  });

  useEffect(() => {
    onChange({
      events: agent.events,
      session: agent.session,
      status: turnError ? "error" : agent.status,
      updatedAt: Date.now(),
    });
  }, [agent.events, agent.session, agent.status, onChange, turnError]);

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const errorMessage = cancellationError ?? turnError ?? agent.error?.message;
  const usage = summarizeUsage(agent.events);

  const prepareTurn = () => {
    cancellationRef.current = { requested: false };
    setCancellationError(undefined);
    setCancellationState("idle");
    setTurnError(undefined);
  };

  const requestCancellation = () => {
    if (!isBusy || cancellationState !== "idle") return;
    cancellationRef.current.requested = true;
    setCancellationState("requested");
    if (cancellationRef.current.turnId) cancelTurn(cancellationRef.current.turnId);
  };

  const submit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isBusy || !providerReady) return;
    prepareTurn();
    if (text.length > 0 && agent.data.messages.length === 0) {
      onChange({ title: titleFromPrompt(text) });
    }

    if (message.files.length === 0) {
      await agent.send({ message: text });
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) parts.push({ text, type: "text" });
    for (const file of message.files) {
      parts.push({ data: file.url, filename: file.filename, mediaType: file.mediaType, type: "file" });
    }
    await agent.send({ message: parts });
  };

  const respond = (inputResponses: readonly AgentInputResponse[]) => {
    prepareTurn();
    return agent.send({ inputResponses });
  };

  const isEmpty = agent.data.messages.length === 0;
  return (
    <PromptInputProvider>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {errorMessage ? (
          <div className="mx-auto w-full max-w-4xl shrink-0 px-4 pt-3 sm:px-8">
            <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm sm:flex-row">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{messages.requestFailed}</p>
                <p className="mt-0.5 break-words text-muted-foreground">{errorMessage}</p>
              </div>
              <Button className="shrink-0" onClick={() => void submit({ files: [], text: messages.retryPrompt })} size="sm" variant="outline">
                <RotateCcwIcon className="size-4" />
                {messages.retry}
              </Button>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyThread disabled={!providerReady} messages={messages} onPrompt={(prompt) => void submit({ files: [], text: prompt })} />
        ) : (
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="mx-auto w-full max-w-4xl gap-8 px-4 py-8 sm:px-8">
              {agent.data.messages.map((message, index) => (
                <AgentMessage
                  canRespond={!isBusy}
                  isStreaming={agent.status === "streaming" && index === agent.data.messages.length - 1}
                  key={message.id}
                  locale={locale}
                  message={message}
                  onInputResponses={respond}
                />
              ))}
            </ConversationContent>
            <ConversationScrollButton>
              <ArrowDownIcon className="size-4" />
            </ConversationScrollButton>
          </Conversation>
        )}

        <div className={cn("mx-auto w-full shrink-0 px-4 pb-4 sm:px-8", isEmpty ? "max-w-2xl pb-[10vh]" : "max-w-4xl")}>
        <AgentComposer
          commands={commands}
          disabled={!providerReady}
          mentions={mentions}
          messages={messages}
          models={models}
            onPreferencesChange={(preferences) => onChange({ preferences })}
            onStop={requestCancellation}
            onSubmit={submit}
          preferences={thread.preferences}
          reasoningLevels={reasoningLevels}
            status={isBusy && cancellationState !== "idle" ? "submitted" : errorMessage ? "error" : agent.status}
            usage={usage}
          />
        </div>
      </main>
    </PromptInputProvider>
  );
}

function EmptyThread({ disabled, messages, onPrompt }: { readonly disabled: boolean; readonly messages: AgentMessages; readonly onPrompt: (prompt: string) => void }) {
  const suggestions = [
    messages.suggestionInspect,
    messages.suggestionImplement,
    messages.suggestionResearch,
    messages.suggestionReview,
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-8 text-center">
      <div className="space-y-3">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm">
          <SparklesIcon className="size-5" />
        </div>
        <h1 className="text-3xl font-medium text-foreground sm:text-4xl">{messages.emptyTitle}</h1>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <Button className="h-auto justify-start whitespace-normal px-4 py-3 text-left text-sm" disabled={disabled} key={suggestion} onClick={() => onPrompt(suggestion)} variant="outline">
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

function latestTurnOutcome(events: readonly HandleMessageStreamEvent[]): "cancelled" | "completed" | "failed" | undefined {
  const event = [...events].reverse().find((candidate) => candidate.type === "turn.cancelled" || candidate.type === "turn.completed" || candidate.type === "turn.failed");
  if (event?.type === "turn.cancelled") return "cancelled";
  if (event?.type === "turn.completed") return "completed";
  if (event?.type === "turn.failed") return "failed";
  return undefined;
}

function latestTurnFailure(events: readonly HandleMessageStreamEvent[]): string | undefined {
  if (latestTurnOutcome(events) !== "failed") return undefined;
  const event = [...events].reverse().find((candidate) => candidate.type === "turn.failed" || candidate.type === "step.failed");
  return event?.type === "turn.failed" || event?.type === "step.failed" ? event.data.message : undefined;
}
