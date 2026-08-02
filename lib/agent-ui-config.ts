import type { AgentThreadPreferences } from "@muses/agent-ui";
import {
  AGENT_MODEL_OPTIONS,
  AGENT_REASONING_LEVELS,
  DEFAULT_AGENT_MODEL_ID,
  DEFAULT_AGENT_REASONING,
} from "./agent-profile.ts";

export const AGENT_UI_MODELS = AGENT_MODEL_OPTIONS;

export const AGENT_UI_REASONING_LEVELS: readonly string[] = AGENT_REASONING_LEVELS;

export const AGENT_UI_DEFAULT_PREFERENCES: AgentThreadPreferences = {
  modelId: DEFAULT_AGENT_MODEL_ID,
  reasoning: DEFAULT_AGENT_REASONING,
};
