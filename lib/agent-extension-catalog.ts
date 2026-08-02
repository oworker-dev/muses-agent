import type {
  AgentExtensionRef,
  AgentRunPolicy,
  AgentProfileRef as ContractAgentProfileRef,
} from "../contracts/agent-run.ts";
import { AGENT_PROFILE_OPTIONS } from "./agent-profile.ts";

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
): AgentRunPolicy {
  const profile = AGENT_PROFILE_OPTIONS.find(
    (candidate) =>
      candidate.profileId === profileRef.profileId && candidate.version === profileRef.version,
  );
  if (!profile) throw new Error("The Agent profile is not published.");

  const skills = resolveExtensionRefs(
    "skill",
    requested.skills ?? profile.defaultSkills,
    profile.allowedSkills,
    revokedRefs,
  );
  const mcpConnections = resolveExtensionRefs(
    "mcp",
    requested.mcpConnections ?? profile.defaultMcpConnections,
    profile.allowedMcpConnections,
    revokedRefs,
  );

  return {
    ...(requested.hostCapabilities ? { hostCapabilities: requested.hostCapabilities } : {}),
    ...(requested.limits ? { limits: requested.limits } : {}),
    mcpConnections,
    skills,
  };
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
): readonly AgentExtensionRef[] {
  const allowedKeys = new Set(allowed.map(extensionRefKey));
  const resolved = new Map<string, AgentExtensionRef>();
  for (const ref of requested) {
    const key = extensionRefKey(ref);
    if (!allowedKeys.has(key)) {
      throw new Error(`Extension ${key} is not allowed by the Agent profile.`);
    }
    const manifest = AGENT_EXTENSION_CATALOG.find(
      (candidate) => extensionRefKey(candidate) === key && candidate.kind === kind,
    );
    if (!manifest) throw new Error(`Extension ${key} is not installed as ${kind}.`);
    if (manifest.status !== "published" || revokedRefs.has(key)) {
      throw new Error(`Extension ${key} is revoked.`);
    }
    resolved.set(key, { id: manifest.id, version: manifest.version });
  }
  return [...resolved.values()].sort((left, right) =>
    extensionRefKey(left).localeCompare(extensionRefKey(right)),
  );
}
