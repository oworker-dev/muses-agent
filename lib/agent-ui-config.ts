import type {
  AgentExtensionInfo,
  AgentPromptMenuItem,
  AgentThreadPreferences,
} from "@muses/agent-ui";
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

export const AGENT_UI_COMMANDS: readonly AgentPromptMenuItem[] = [
  {
    id: "software-task",
    label: "Software task",
    value: "/software-task",
    description: "Load the published software workspace procedure.",
    keywords: ["skill", "code", "debug", "review"],
  },
];

export const AGENT_UI_MENTIONS: readonly AgentPromptMenuItem[] = [
  {
    id: "workspace",
    label: "Current workspace",
    value: "@workspace",
    description: "Reference files and tools in this session sandbox.",
    keywords: ["files", "sandbox", "project"],
  },
];

export const AGENT_UI_EXTENSIONS: readonly AgentExtensionInfo[] = [
  {
    id: "software-task",
    kind: "skill",
    label: "Software task",
    status: "available",
    version: "1.0.0",
    description: "Inspect, implement, test, and report a software workspace change.",
  },
];
