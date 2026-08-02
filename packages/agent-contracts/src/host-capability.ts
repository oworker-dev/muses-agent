import type { JsonValue } from "./agent-run.js";

export const AGENT_HOST_CAPABILITY_CONTRACT_VERSION = "0.1.0-draft" as const;

export type AgentHostCapabilitySideEffect = "none" | "project-write" | "external";

export type AgentHostCapabilityDescriptor = {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, JsonValue>>;
  readonly requiredPermissions: readonly string[];
  readonly sideEffect: AgentHostCapabilitySideEffect;
};

export type AgentHostCapabilitiesResponse = {
  readonly contractVersion: typeof AGENT_HOST_CAPABILITY_CONTRACT_VERSION;
  readonly capabilities: readonly AgentHostCapabilityDescriptor[];
};

export type AgentHostCapabilityInvokeRequest = {
  readonly capability: string;
  readonly input: Readonly<Record<string, JsonValue>>;
  readonly runId: string;
  readonly sessionId: string;
  readonly correlationId?: string;
};

export type AgentHostCapabilityInvokeResponse = {
  readonly contractVersion: typeof AGENT_HOST_CAPABILITY_CONTRACT_VERSION;
  readonly capability: string;
  readonly output: JsonValue;
};
