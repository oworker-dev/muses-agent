import type {
  AgentExtensionInfo,
  AgentPromptMenuItem,
  AgentThreadPreferences,
} from "@oworker/open-agent-ui";
import {
  DEFAULT_AGENT_RUNTIME_CONFIG,
  findAgentRuntimeModel,
  type AgentRuntimeConfigSnapshot,
} from "./agent-runtime-config.ts";

export function createAgentUiConfig(config: AgentRuntimeConfigSnapshot = DEFAULT_AGENT_RUNTIME_CONFIG) {
  const modelOptions = config.models.map(({ contextWindowTokens, id, label }) => ({
    contextWindowTokens,
    id,
    label,
  }));
  const defaultModel = findAgentRuntimeModel(config, config.defaultModelId) ?? config.models[0]!;
  const skills = config.profile.allowedSkills.filter((extension) => extension.id === "software-task");
  return {
    models: modelOptions,
    reasoningLevels: defaultModel.reasoningLevels,
    defaultPreferences: {
      modelId: defaultModel.id,
      reasoning: defaultModel.defaultReasoning,
    },
    commands: skills.map((skill) => ({
      id: skill.id,
      label: skill.id,
      value: `/${skill.id}`,
      description: `Load the ${skill.id} skill.`,
      keywords: ["skill"],
    })),
    extensions: skills.map((skill) => ({
      id: skill.id,
      kind: "skill" as const,
      label: skill.id,
      status: "available" as const,
      version: skill.version,
      description: `Published ${skill.id} skill.`,
    })),
  } as const;
}

const DEFAULT_UI_CONFIG = createAgentUiConfig();

export const AGENT_UI_MODELS = DEFAULT_UI_CONFIG.models;

export const AGENT_UI_REASONING_LEVELS: readonly string[] = DEFAULT_UI_CONFIG.reasoningLevels;

export const AGENT_UI_DEFAULT_PREFERENCES: AgentThreadPreferences = DEFAULT_UI_CONFIG.defaultPreferences;

export const AGENT_UI_COMMANDS: readonly AgentPromptMenuItem[] = DEFAULT_UI_CONFIG.commands;

export const AGENT_UI_MENTIONS: readonly AgentPromptMenuItem[] = [
  {
    id: "workspace",
    label: "Current workspace",
    value: "@workspace",
    description: "Reference files and tools in this session sandbox.",
    keywords: ["files", "sandbox", "project"],
  },
];

export const AGENT_UI_EXTENSIONS: readonly AgentExtensionInfo[] = DEFAULT_UI_CONFIG.extensions;
