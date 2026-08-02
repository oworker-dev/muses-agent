import { AgentWorkspace } from "@muses/agent-ui";
import {
  AGENT_UI_DEFAULT_PREFERENCES,
  AGENT_UI_MODELS,
  AGENT_UI_REASONING_LEVELS,
} from "@/lib/agent-ui-config";

export default function Page() {
  return (
    <AgentWorkspace
      agentName="muses-agent"
      defaultPreferences={AGENT_UI_DEFAULT_PREFERENCES}
      models={AGENT_UI_MODELS}
      productName="Agent"
      reasoningLevels={AGENT_UI_REASONING_LEVELS}
    />
  );
}
