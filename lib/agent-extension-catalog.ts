import type {
  AgentExtensionRef,
  AgentRunLimits,
  AgentRunPolicy,
  AgentProfileRef as ContractAgentProfileRef,
} from "../contracts/agent-run.ts";
import type {
  AgentRuntimeConfigSnapshot,
  AgentRuntimeExtension,
} from "@oworker/open-agent-contracts/runtime-config";
import { DEFAULT_AGENT_RUNTIME_CONFIG } from "./agent-runtime-config.ts";

export type AgentExtensionKind = "mcp" | "skill";
export type AgentExtensionStatus = "published" | "revoked";
export type AgentExtensionCredentialMode = "none" | "reference-required";
export type AgentExtensionTenantDefault = "disabled" | "enabled";

export type AgentExtensionManifest = AgentExtensionRef & {
  readonly credentialMode: AgentExtensionCredentialMode;
  readonly defaultTenantStatus: AgentExtensionTenantDefault;
  readonly description: string;
  readonly kind: AgentExtensionKind;
  readonly requiredPermissions: readonly string[];
  readonly status: AgentExtensionStatus;
};

export const AGENT_EXTENSION_CATALOG: readonly AgentExtensionManifest[] = [
  {
    id: "software-task",
    version: "1.0.0",
    kind: "skill",
    credentialMode: "none",
    defaultTenantStatus: "enabled",
    requiredPermissions: [],
    status: "published",
    description: "Inspect, implement, test, and report a software workspace change.",
  },
];

/**
 * Resolves the exact extension grant recorded on an AgentRun. A request can
 * narrow a profile, but never add an extension that the published profile did
 * not allow. Revocation is checked again when a durable session starts.
 */
export function resolveAgentRunPolicy(
  profileRef: ContractAgentProfileRef,
  requested: AgentRunPolicy,
  revokedRefs: ReadonlySet<string> = revokedExtensionRefsFromEnvironment(),
  config: AgentRuntimeConfigSnapshot = DEFAULT_AGENT_RUNTIME_CONFIG,
): AgentRunPolicy {
  const profile = config.profile;
  if (profile.id !== profileRef.profileId || profile.version !== profileRef.version) {
    throw new Error("The Agent profile is not published by the active runtime config.");
  }

  const skills = resolveExtensionRefs(
    "skill",
    requested.skills ?? profile.defaultSkills,
    profile.allowedSkills,
    revokedRefs,
    config,
  );
  const mcpConnections = resolveExtensionRefs(
    "mcp",
    requested.mcpConnections ?? profile.defaultMcpConnections,
    profile.allowedMcpConnections,
    revokedRefs,
    config,
  );
  const limits = mergeAgentRunLimits(config.limits, requested.limits);

  return {
    ...(requested.hostCapabilities ? { hostCapabilities: requested.hostCapabilities } : {}),
    ...(limits ? { limits } : {}),
    mcpConnections,
    skills,
  };
}

export function mergeAgentRunLimits(
  configured: AgentRunLimits | undefined,
  requested: AgentRunLimits | undefined,
): AgentRunLimits | undefined {
  if (!configured && !requested) return undefined;
  const merged: Partial<Record<keyof AgentRunLimits, number>> = {};
  for (const name of [
    "maxDurationMs",
    "maxInputTokens",
    "maxModelCalls",
    "maxOutputTokens",
    "maxToolCalls",
    "maxTurns",
  ] as const) {
    const configuredValue = configured?.[name];
    const requestedValue = requested?.[name];
    if (configuredValue !== undefined && requestedValue !== undefined) {
      merged[name] = Math.min(configuredValue, requestedValue);
    } else if (configuredValue !== undefined) {
      merged[name] = configuredValue;
    } else if (requestedValue !== undefined) {
      merged[name] = requestedValue;
    }
  }
  return Object.keys(merged).length ? merged : undefined;
}

export function extensionRefKey(ref: AgentExtensionRef): string {
  return `${ref.id}@${ref.version}`;
}

export function revokedExtensionRefsFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ReadonlySet<string> {
  const configured = environment.AGENT_REVOKED_EXTENSIONS?.trim();
  if (!configured) return new Set();
  return new Set(
    configured
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function resolveExtensionRefs(
  kind: AgentExtensionKind,
  requested: readonly AgentExtensionRef[],
  allowed: readonly AgentExtensionRef[],
  revokedRefs: ReadonlySet<string>,
  config: AgentRuntimeConfigSnapshot,
): readonly AgentExtensionRef[] {
  const allowedKeys = new Set(allowed.map(extensionRefKey));
  const resolved = new Map<string, AgentExtensionRef>();
  for (const ref of requested) {
    const key = extensionRefKey(ref);
    if (!allowedKeys.has(key)) {
      throw new Error(`Extension ${key} is not allowed by the Agent profile.`);
    }
    const runtimeManifest = config.extensions?.find(
      (candidate) =>
        candidate.id === ref.id &&
        candidate.version === ref.version &&
        candidate.kind === kind,
    );
    const staticManifest = AGENT_EXTENSION_CATALOG.find(
      (candidate) => extensionRefKey(candidate) === key && candidate.kind === kind,
    );
    const manifest = runtimeManifest ?? staticManifest;
    if (!manifest) throw new Error(`Extension ${key} is not installed as ${kind}.`);
    if (
      revokedRefs.has(key) ||
      runtimeManifest === undefined && staticManifest?.status !== "published"
    ) {
      throw new Error(`Extension ${key} is revoked.`);
    }
    resolved.set(key, { id: manifest.id, version: manifest.version });
  }
  return [...resolved.values()].sort((left, right) =>
    extensionRefKey(left).localeCompare(extensionRefKey(right)),
  );
}

export function runtimeExtensionForRef(
  config: AgentRuntimeConfigSnapshot,
  kind: AgentExtensionKind,
  ref: AgentExtensionRef,
): AgentRuntimeExtension | undefined {
  return config.extensions?.find(
    (extension) =>
      extension.kind === kind &&
      extension.id === ref.id &&
      extension.version === ref.version,
  );
}
