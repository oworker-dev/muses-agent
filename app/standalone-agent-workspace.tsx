"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  AgentWorkspace,
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
  const handleActiveThreadChange = useCallback((threadId: string) => {
    const target = `/threads/${encodeURIComponent(threadId)}`;
    if (pathname !== target) window.history.replaceState(null, "", target);
  }, [pathname]);

  return (
    <AgentWorkspace
      agentName="open-agent"
      commands={commands}
      defaultPreferences={defaultPreferences}
      extensions={extensions}
      initialThreadId={initialThreadId}
      mentions={mentions}
      models={models}
      onActiveThreadChange={handleActiveThreadChange}
      productName="Open Agent"
      reasoningLevels={reasoningLevels}
      runtimeStatus={runtimeStatus}
      threadStorage={threadStorage}
    />
  );
}
