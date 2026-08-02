import type { AgentRunPolicy, JsonValue } from "./agent-run.js";

export const AGENT_EMBED_CONTRACT_VERSION = "0.1.0" as const;

export type AgentEmbedTheme = "dark" | "light" | "system";

export type AgentEmbedConfigureMessage = {
  readonly type: "agent.embed.configure";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
  readonly requestId: string;
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly serviceUrl: string;
  readonly storageKey: string;
  readonly profile: {
    readonly id: string;
    readonly version: string;
  };
  readonly runPolicy?: AgentRunPolicy;
  readonly clientContext?: string | readonly string[] | Readonly<Record<string, JsonValue>>;
  readonly locale?: "en" | "zh-CN";
  readonly theme?: AgentEmbedTheme;
};

export type AgentEmbedHostMessage = AgentEmbedConfigureMessage;

export type AgentEmbedReadyMessage = {
  readonly type: "agent.embed.ready";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
};

export type AgentEmbedConfiguredMessage = {
  readonly type: "agent.embed.configured";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
  readonly requestId: string;
};

export type AgentEmbedErrorMessage = {
  readonly type: "agent.embed.error";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
  readonly requestId?: string;
  readonly code: string;
  readonly message: string;
};

export type AgentEmbedTurnMessage = {
  readonly type:
    | "agent.embed.turn-started"
    | "agent.embed.turn-completed"
    | "agent.embed.turn-failed"
    | "agent.embed.turn-cancelled";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
  readonly turnId: string;
  readonly message?: string;
};

export type AgentEmbedHostCapabilityMessage = {
  readonly type: "agent.embed.host-capability-completed";
  readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
  readonly capability: string;
  readonly output: JsonValue;
};

export type AgentEmbedEvent =
  | AgentEmbedReadyMessage
  | AgentEmbedConfiguredMessage
  | AgentEmbedErrorMessage
  | AgentEmbedTurnMessage
  | AgentEmbedHostCapabilityMessage;

export function parseAgentEmbedHostMessage(value: unknown): AgentEmbedHostMessage | undefined {
  if (!isRecord(value)) return undefined;
  if (
    value.type !== "agent.embed.configure" ||
    value.contractVersion !== AGENT_EMBED_CONTRACT_VERSION ||
    !isText(value.requestId, 200) ||
    !isText(value.accessToken, 16_384) ||
    !isIsoDate(value.expiresAt) ||
    !isHttpUrl(value.serviceUrl) ||
    !isText(value.storageKey, 200) ||
    !isRecord(value.profile) ||
    !isText(value.profile.id, 120) ||
    !isText(value.profile.version, 80)
  ) {
    return undefined;
  }
  if (
    value.locale !== undefined && value.locale !== "en" && value.locale !== "zh-CN" ||
    value.theme !== undefined && value.theme !== "dark" && value.theme !== "light" && value.theme !== "system"
  ) {
    return undefined;
  }
  return value as AgentEmbedHostMessage;
}

export function isAllowedAgentEmbedParentOrigin(
  referrer: string,
  allowedOrigins: readonly string[],
): string | undefined {
  let origin: string;
  try {
    origin = new URL(referrer).origin;
  } catch {
    return undefined;
  }
  return allowedOrigins.includes(origin) ? origin : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function isIsoDate(value: unknown): value is string {
  return isText(value, 64) && Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: unknown): value is string {
  if (!isText(value, 2_048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
