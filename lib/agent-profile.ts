export const AGENT_REASONING_LEVELS = ["low", "medium", "high", "xhigh"] as const;

export type AgentReasoningLevel = (typeof AGENT_REASONING_LEVELS)[number];

export type AgentModelOption = {
  readonly contextWindowTokens: number;
  readonly id: string;
  readonly label: string;
};

export type AgentProfileOption = {
  readonly allowedMcpConnections: readonly AgentExtensionRef[];
  readonly allowedSkills: readonly AgentExtensionRef[];
  readonly defaultMcpConnections: readonly AgentExtensionRef[];
  readonly defaultSkills: readonly AgentExtensionRef[];
  readonly profileId: string;
  readonly version: string;
  readonly label: string;
  readonly outputMode: "text" | "json";
};

export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000;
export const DEFAULT_MODEL_MAX_OUTPUT_TOKENS = 4_096;

export function readAgentModelMaxOutputTokens(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = environment.AGENT_MODEL_MAX_OUTPUT_TOKENS?.trim();
  if (!configured) return DEFAULT_MODEL_MAX_OUTPUT_TOKENS;
  const tokens = Number(configured);
  if (!Number.isInteger(tokens) || tokens < 256 || tokens > 128_000) {
    throw new Error(
      "AGENT_MODEL_MAX_OUTPUT_TOKENS must be an integer from 256 to 128000.",
    );
  }
  return tokens;
}

export function readAgentEvalContextWindowTokens(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = environment.AGENT_EVAL_CONTEXT_WINDOW_TOKENS?.trim();
  if (!configured) return DEFAULT_CONTEXT_WINDOW_TOKENS;
  const tokens = Number(configured);
  if (!Number.isInteger(tokens) || tokens < 2_048 || tokens > 2_000_000) {
    throw new Error(
      "AGENT_EVAL_CONTEXT_WINDOW_TOKENS must be an integer from 2048 to 2000000.",
    );
  }
  return tokens;
}

export const AGENT_MODEL_OPTIONS = [
  {
    contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
  },
  {
    contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
  },
] as const satisfies readonly AgentModelOption[];

export type AgentModelId = (typeof AGENT_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_AGENT_MODEL_ID: AgentModelId = "gpt-5.6-sol";
export const DEFAULT_AGENT_REASONING: AgentReasoningLevel = "high";

/**
 * Profiles are the stable execution policy boundary. Hosts may expose a
 * subset, but they cannot invent a profile by changing a Workflow node.
 */
export const AGENT_PROFILE_OPTIONS = [
  {
    allowedMcpConnections: [],
    allowedSkills: [{ id: "software-task", version: "1.0.0" }],
    defaultMcpConnections: [],
    defaultSkills: [{ id: "software-task", version: "1.0.0" }],
    profileId: "general-purpose",
    version: "0.1.0",
    label: "General purpose",
    outputMode: "text",
  },
  {
    allowedMcpConnections: [],
    allowedSkills: [{ id: "software-task", version: "1.0.0" }],
    defaultMcpConnections: [],
    defaultSkills: [{ id: "software-task", version: "1.0.0" }],
    profileId: "muses-platform",
    version: "0.1.0",
    label: "Muses platform Agent",
    outputMode: "text",
  },
] as const satisfies readonly AgentProfileOption[];

export type AgentProfileRef = (typeof AGENT_PROFILE_OPTIONS)[number];

export function isAgentProfileRef(value: unknown): value is AgentProfileRef {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return AGENT_PROFILE_OPTIONS.some(
    (profile) =>
      profile.profileId === candidate.profileId &&
      profile.version === candidate.version,
  );
}

export function getAgentProfile(profileId: string, version: string): AgentProfileRef | undefined {
  return AGENT_PROFILE_OPTIONS.find(
    (profile) => profile.profileId === profileId && profile.version === version,
  );
}

export function isAgentModelId(value: unknown): value is AgentModelId {
  return AGENT_MODEL_OPTIONS.some((model) => model.id === value);
}

export function isAgentReasoningLevel(value: unknown): value is AgentReasoningLevel {
  return AGENT_REASONING_LEVELS.some((level) => level === value);
}
import type { AgentExtensionRef } from "../contracts/agent-run.ts";
