"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  AgentWorkspace,
  createHttpAgentMailbox,
  createHttpAgentThreadStorage,
  type AgentExtensionInfo,
  type AgentModelOption,
  type AgentPromptMenuItem,
  type AgentRuntimeStatus,
  type AgentThreadPreferences,
} from "@oworker/open-agent-ui";

type StandaloneAgentWorkspaceProps = {
  readonly commands: readonly AgentPromptMenuItem[];
  readonly defaultPreferences: AgentThreadPreferences;
  readonly extensions: readonly AgentExtensionInfo[];
  readonly initialSubagentSessionId?: string;
  readonly initialThreadId?: string;
  readonly mentions: readonly AgentPromptMenuItem[];
  readonly models: readonly AgentModelOption[];
  readonly reasoningLevels: readonly string[];
  readonly runtimeStatus: AgentRuntimeStatus;
};

export function StandaloneAgentWorkspace({
  commands,
  defaultPreferences,
  extensions,
  initialSubagentSessionId,
  initialThreadId,
  mentions,
  models,
  reasoningLevels,
  runtimeStatus,
}: StandaloneAgentWorkspaceProps) {
  const pathname = usePathname();
  const threadStorage = useMemo(
    () => createHttpAgentThreadStorage({ endpoint: "/api/standalone/thread-collections" }),
    [],
  );
  const mailbox = useMemo(
    () => createHttpAgentMailbox({ endpoint: "/api/standalone/mailbox" }),
    [],
  );
  const handleActiveThreadChange = useCallback((threadId: string) => {
    const target = `/threads/${encodeURIComponent(threadId)}`;
    if (window.location.pathname !== target) window.history.replaceState(null, "", target);
  }, [pathname]);
  const handleActiveSubagentChange = useCallback((threadId: string, sessionId?: string) => {
    const target = sessionId
      ? `/threads/${encodeURIComponent(threadId)}/agents/${encodeURIComponent(sessionId)}`
      : `/threads/${encodeURIComponent(threadId)}`;
    if (window.location.pathname !== target) window.history.replaceState(null, "", target);
  }, []);

  return (
    <AgentWorkspace
      agentName="open-agent"
      commands={commands}
      defaultPreferences={defaultPreferences}
      extensions={extensions}
      initialSubagentSessionId={initialSubagentSessionId}
      initialThreadId={initialThreadId}
      mentions={mentions}
      models={models}
      mailbox={mailbox}
      onActiveSubagentChange={handleActiveSubagentChange}
      onActiveThreadChange={handleActiveThreadChange}
      productName="Open Agent"
      reasoningLevels={reasoningLevels}
      runtimeStatus={runtimeStatus}
      threadStorage={threadStorage}
    />
  );
}
