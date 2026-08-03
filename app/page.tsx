import { AgentWorkspace } from "@muses/agent-ui";
import { readAgentRuntimeStatus } from "@/lib/agent-runtime-status";
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
  return (
    <AgentWorkspace
      agentName="muses-agent"
      commands={AGENT_UI_COMMANDS}
      defaultPreferences={AGENT_UI_DEFAULT_PREFERENCES}
      extensions={AGENT_UI_EXTENSIONS}
      mentions={AGENT_UI_MENTIONS}
      models={AGENT_UI_MODELS}
      productName="Agent"
      reasoningLevels={AGENT_UI_REASONING_LEVELS}
      runtimeStatus={readAgentRuntimeStatus()}
    />
  );
}
