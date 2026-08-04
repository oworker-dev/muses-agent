"use client";

import type { HandleMessageStreamEvent, PrepareSend } from "eve/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AgentWorkspace,
  createHttpAgentThreadStorage,
  type AgentThread,
  type AgentRuntimeStatus,
} from "@oworker/open-agent-ui";
import { createAgentUiConfig, AGENT_UI_MENTIONS } from "@/lib/agent-ui-config";
import { DEFAULT_AGENT_RUNTIME_CONFIG } from "@/lib/agent-runtime-config";
import {
  AGENT_EMBED_CONTRACT_VERSION,
  isAllowedAgentEmbedParentOrigin,
  parseAgentEmbedHostMessage,
  type AgentEmbedConfigureMessage,
  type AgentEmbedEvent,
} from "@/contracts/agent-embed";

export function AgentEmbed({ allowedOrigins, runtimeStatus }: { readonly allowedOrigins: readonly string[]; readonly runtimeStatus: AgentRuntimeStatus }) {
  const [configuration, setConfiguration] = useState<AgentEmbedConfigureMessage>();
  const [fatalError, setFatalError] = useState<string>();
  const parentOriginRef = useRef<string | undefined>(undefined);
  const accessTokenRef = useRef("");

  const post = useCallback((event: AgentEmbedEvent) => {
    const parentOrigin = parentOriginRef.current;
    if (!parentOrigin || window.parent === window) return;
    window.parent.postMessage(event, parentOrigin);
  }, []);

  useEffect(() => {
    const parentOrigin = isAllowedAgentEmbedParentOrigin(document.referrer, allowedOrigins);
    if (!parentOrigin || window.parent === window) {
      setFatalError("This Agent embed was not opened by an allowed host.");
      return;
    }
    parentOriginRef.current = parentOrigin;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return;
      const message = parseAgentEmbedHostMessage(event.data);
      if (!message) {
        post({
          type: "agent.embed.error",
          contractVersion: AGENT_EMBED_CONTRACT_VERSION,
          code: "invalid-configuration",
          message: "The Agent embed configuration is invalid.",
        });
        return;
      }
      if (new URL(message.serviceUrl).origin !== window.location.origin) {
        post({
          type: "agent.embed.error",
          contractVersion: AGENT_EMBED_CONTRACT_VERSION,
          requestId: message.requestId,
          code: "service-origin-mismatch",
          message: "The Agent service URL must use the Embed origin.",
        });
        return;
      }
      if (Date.parse(message.expiresAt) <= Date.now()) {
        post({
          type: "agent.embed.error",
          contractVersion: AGENT_EMBED_CONTRACT_VERSION,
          requestId: message.requestId,
          code: "access-token-expired",
          message: "The Agent access token is expired.",
        });
        return;
      }
      accessTokenRef.current = message.accessToken;
      applyTheme(message.theme ?? "system");
      if (message.locale) {
        window.localStorage.setItem(`${message.storageKey}:locale`, message.locale);
      }
      setConfiguration(message);
      setFatalError(undefined);
      post({
        type: "agent.embed.configured",
        contractVersion: AGENT_EMBED_CONTRACT_VERSION,
        requestId: message.requestId,
      });
    };
    window.addEventListener("message", receive);
    post({ type: "agent.embed.ready", contractVersion: AGENT_EMBED_CONTRACT_VERSION });
    return () => window.removeEventListener("message", receive);
  }, [allowedOrigins, post]);

  const client = useMemo(() => configuration ? {
    headers: async () => ({
      authorization: `Bearer ${accessTokenRef.current}`,
      "x-agent-profile-id": configuration.profile.id,
      "x-agent-profile-version": configuration.profile.version,
      ...(configuration.runPolicy
        ? { "x-agent-run-policy": encodeBase64Url(configuration.runPolicy) }
        : {}),
    }),
    host: configuration.serviceUrl,
    prepareSend: withClientContext(configuration.clientContext),
  } : undefined, [configuration]);

  const threadStorage = useMemo(() => configuration ? createHttpAgentThreadStorage({
    endpoint: `${configuration.serviceUrl.replace(/\/$/, "")}/api/agent/thread-collections`,
    getAccessToken: () => accessTokenRef.current,
  }) : undefined, [configuration]);

  const onEvent = useCallback((event: HandleMessageStreamEvent) => {
    const projected = projectEmbedEvent(event);
    if (projected) post(projected);
  }, [post]);

  const onDeleteThread = useCallback(async (thread: AgentThread) => {
    const sessionId = thread.session.sessionId;
    const continuationToken = thread.session.continuationToken;
    if (!sessionId) return;
    if (!continuationToken) throw new Error("The durable session cannot be deleted without its continuation token.");
    const response = await fetch(
      `${configuration?.serviceUrl.replace(/\/$/, "")}/api/agent/sessions/${encodeURIComponent(sessionId)}`,
      {
        body: JSON.stringify({ continuationToken }),
        headers: {
          authorization: `Bearer ${accessTokenRef.current}`,
          "content-type": "application/json",
        },
        method: "DELETE",
        redirect: "error",
      },
    );
    if (response.ok) return;
    let message = `The Agent session could not be deleted (${response.status}).`;
    try {
      const body = await response.json() as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      // Preserve the status-based fallback when the service returns no JSON body.
    }
    throw new Error(message);
  }, [configuration?.serviceUrl]);

  if (fatalError) {
    return <main className="flex h-dvh items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">{fatalError}</main>;
  }
  if (!configuration || !client || !threadStorage) {
    return <main className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Connecting to host…</main>;
  }
  const ui = createAgentUiConfig(configuration.runtimeConfig ?? DEFAULT_AGENT_RUNTIME_CONFIG);
  return (
    <AgentWorkspace
      agentName="open-agent"
      client={client}
      commands={ui.commands}
      defaultPreferences={ui.defaultPreferences}
      extensions={ui.extensions}
      key={`${configuration.storageKey}:${configuration.profile.id}@${configuration.profile.version}`}
      models={ui.models}
      mentions={AGENT_UI_MENTIONS}
      onEvent={onEvent}
      onDeleteThread={onDeleteThread}
      productName="Agent"
      reasoningLevels={ui.reasoningLevels}
      runtimeStatus={runtimeStatus}
      storageKey={configuration.storageKey}
      threadStorage={threadStorage}
    />
  );
}

function withClientContext(clientContext: AgentEmbedConfigureMessage["clientContext"]): PrepareSend | undefined {
  if (clientContext === undefined) return undefined;
  return (input) => ({ ...input, clientContext });
}

function applyTheme(theme: "dark" | "light" | "system") {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
}

function encodeBase64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function projectEmbedEvent(event: HandleMessageStreamEvent): AgentEmbedEvent | undefined {
  if (event.type === "turn.started") {
    return { type: "agent.embed.turn-started", contractVersion: AGENT_EMBED_CONTRACT_VERSION, turnId: event.data.turnId };
  }
  if (event.type === "turn.completed") {
    return { type: "agent.embed.turn-completed", contractVersion: AGENT_EMBED_CONTRACT_VERSION, turnId: event.data.turnId };
  }
  if (event.type === "turn.cancelled") {
    return { type: "agent.embed.turn-cancelled", contractVersion: AGENT_EMBED_CONTRACT_VERSION, turnId: event.data.turnId };
  }
  if (event.type === "turn.failed") {
    return { type: "agent.embed.turn-failed", contractVersion: AGENT_EMBED_CONTRACT_VERSION, turnId: event.data.turnId, message: event.data.message };
  }
  if (
    event.type === "action.result" &&
    event.data.status === "completed" &&
    event.data.result.kind === "tool-result" &&
    event.data.result.toolName === "host_invoke" &&
    isRecord(event.data.result.output) &&
    typeof event.data.result.output.capability === "string" &&
    "output" in event.data.result.output
  ) {
    return {
      type: "agent.embed.host-capability-completed",
      contractVersion: AGENT_EMBED_CONTRACT_VERSION,
      capability: event.data.result.output.capability,
      output: event.data.result.output.output,
    };
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, never> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
