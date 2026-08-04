import {
  AGENT_REASONING_LEVELS,
  type AgentReasoningLevel,
} from "@oworker/open-agent-contracts/runtime-config";
import {
  DEFAULT_AGENT_RUNTIME_CONFIG,
  findAgentRuntimeModel,
  isAgentProfileForConfig,
  isAgentReasoningLevelForModel,
} from "./agent-runtime-config.ts";

export { AGENT_REASONING_LEVELS };
export type { AgentReasoningLevel };

export type AgentModelOption = {
  readonly contextWindowTokens: number;
  readonly id: string;
  readonly label: string;
};

export type AgentProfileOption = {
  readonly allowedMcpConnections: typeof DEFAULT_AGENT_RUNTIME_CONFIG.profile.allowedMcpConnections;
  readonly allowedSkills: typeof DEFAULT_AGENT_RUNTIME_CONFIG.profile.allowedSkills;
  readonly defaultMcpConnections: typeof DEFAULT_AGENT_RUNTIME_CONFIG.profile.defaultMcpConnections;
  readonly defaultSkills: typeof DEFAULT_AGENT_RUNTIME_CONFIG.profile.defaultSkills;
  readonly profileId: string;
  readonly version: string;
  readonly label: string;
  readonly outputMode: "text" | "json";
};

export const DEFAULT_CONTEXT_WINDOW_TOKENS =
  DEFAULT_AGENT_RUNTIME_CONFIG.models[0]!.contextWindowTokens;
export const DEFAULT_MODEL_MAX_OUTPUT_TOKENS =
  DEFAULT_AGENT_RUNTIME_CONFIG.models[0]!.maxOutputTokens;

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

/** @deprecated Use the active AgentRuntimeConfigSnapshot model catalog. */
export const AGENT_MODEL_OPTIONS = DEFAULT_AGENT_RUNTIME_CONFIG.models.map(
  ({ contextWindowTokens, id, label }) => ({ contextWindowTokens, id, label }),
) satisfies readonly AgentModelOption[];

export type AgentModelId = string;

export const DEFAULT_AGENT_MODEL_ID = DEFAULT_AGENT_RUNTIME_CONFIG.defaultModelId;
export const DEFAULT_AGENT_REASONING = findAgentRuntimeModel(
  DEFAULT_AGENT_RUNTIME_CONFIG,
  DEFAULT_AGENT_MODEL_ID,
)!.defaultReasoning;

/** @deprecated Use the active AgentRuntimeConfigSnapshot profile. */
export const AGENT_PROFILE_OPTIONS = [
  {
    allowedMcpConnections: DEFAULT_AGENT_RUNTIME_CONFIG.profile.allowedMcpConnections,
    allowedSkills: DEFAULT_AGENT_RUNTIME_CONFIG.profile.allowedSkills,
    defaultMcpConnections: DEFAULT_AGENT_RUNTIME_CONFIG.profile.defaultMcpConnections,
    defaultSkills: DEFAULT_AGENT_RUNTIME_CONFIG.profile.defaultSkills,
    profileId: DEFAULT_AGENT_RUNTIME_CONFIG.profile.id,
    version: DEFAULT_AGENT_RUNTIME_CONFIG.profile.version,
    label: DEFAULT_AGENT_RUNTIME_CONFIG.profile.label,
    outputMode: DEFAULT_AGENT_RUNTIME_CONFIG.profile.outputMode,
  },
] as const satisfies readonly AgentProfileOption[];

export type AgentProfileRef = (typeof AGENT_PROFILE_OPTIONS)[number];

export function isAgentProfileRef(value: unknown): value is AgentProfileRef {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return isAgentProfileForConfig(DEFAULT_AGENT_RUNTIME_CONFIG, candidate);
}

export function getAgentProfile(profileId: string, version: string): AgentProfileRef | undefined {
  return AGENT_PROFILE_OPTIONS.find(
    (profile) => profile.profileId === profileId && profile.version === version,
  );
}

export function isAgentModelId(value: unknown): value is AgentModelId {
  return Boolean(findAgentRuntimeModel(DEFAULT_AGENT_RUNTIME_CONFIG, value));
}

export function isAgentReasoningLevel(value: unknown): value is AgentReasoningLevel {
  const model = findAgentRuntimeModel(DEFAULT_AGENT_RUNTIME_CONFIG, DEFAULT_AGENT_MODEL_ID)!;
  return isAgentReasoningLevelForModel(model, value);
}
