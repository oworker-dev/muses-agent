import "server-only";

import { readAgentRuntimeStatus } from "@/lib/agent-runtime-status";
import { createAgentUiConfig, AGENT_UI_MENTIONS } from "@/lib/agent-ui-config";
import { readDeploymentAgentRuntimeConfig } from "@/lib/agent-runtime-config";
import { resolveStandaloneStorageMode } from "@/lib/standalone-storage-mode";
import { StandaloneAgentWorkspace } from "./standalone-agent-workspace";

export function AgentPage({
  initialSubagentSessionId,
  initialThreadId,
}: {
  readonly initialSubagentSessionId?: string;
  readonly initialThreadId?: string;
}) {
  const ui = createAgentUiConfig(readDeploymentAgentRuntimeConfig());
  return (
    <StandaloneAgentWorkspace
      commands={ui.commands}
      defaultPreferences={ui.defaultPreferences}
      extensions={ui.extensions}
      initialSubagentSessionId={initialSubagentSessionId}
      initialThreadId={initialThreadId}
      mentions={AGENT_UI_MENTIONS}
      models={ui.models}
      reasoningLevels={ui.reasoningLevels}
      runtimeStatus={readAgentRuntimeStatus()}
      storageMode={resolveStandaloneStorageMode()}
    />
  );
}
