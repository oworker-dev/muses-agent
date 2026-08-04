import { AgentWorkspace } from "@oworker/open-agent-ui";
import { readAgentRuntimeStatus } from "@/lib/agent-runtime-status";
import { createAgentUiConfig } from "@/lib/agent-ui-config";
import { readDeploymentAgentRuntimeConfig } from "@/lib/agent-runtime-config";
import {
  AGENT_UI_DEFAULT_PREFERENCES,
  AGENT_UI_COMMANDS,
  AGENT_UI_EXTENSIONS,
  AGENT_UI_MENTIONS,
  AGENT_UI_MODELS,
  AGENT_UI_REASONING_LEVELS,
} from "@/lib/agent-ui-config";

export const dynamic = "force-dynamic";

export default function Page() {
  const ui = createAgentUiConfig(readDeploymentAgentRuntimeConfig());
  return (
    <AgentWorkspace
      agentName="open-agent"
      commands={ui.commands}
      defaultPreferences={ui.defaultPreferences}
      extensions={ui.extensions}
      mentions={AGENT_UI_MENTIONS}
      models={ui.models}
      productName="Agent"
      reasoningLevels={ui.reasoningLevels}
      runtimeStatus={readAgentRuntimeStatus()}
    />
  );
}
