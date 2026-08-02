import type { AgentRunPolicy } from "../contracts/agent-run.ts";
import {
  AGENT_EXTENSION_CATALOG,
  extensionRefKey,
  type AgentExtensionManifest,
} from "./agent-extension-catalog.ts";

export type AgentExtensionInstallationStatus = "enabled" | "revoked";

export type AgentExtensionInstallation = {
  readonly credentialConfigured: boolean;
  readonly id: string;
  readonly kind: AgentExtensionManifest["kind"];
  readonly status: AgentExtensionInstallationStatus;
  readonly version: string;
};

export class AgentExtensionAccessError extends Error {
  readonly code: "extension_credentials_required" | "extension_not_enabled" | "extension_revoked";
  readonly extension: string;

  constructor(
    code: AgentExtensionAccessError["code"],
    extension: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentExtensionAccessError";
    this.code = code;
    this.extension = extension;
  }
}

export function assertAgentRunExtensionsEnabled(
  policy: AgentRunPolicy,
  installations: readonly AgentExtensionInstallation[],
): void {
  const byKey = new Map(installations.map((item) => [extensionRefKey(item), item]));
  for (const ref of [
    ...(policy.skills ?? []),
    ...(policy.mcpConnections ?? []),
  ]) {
    const key = extensionRefKey(ref);
    const manifest = AGENT_EXTENSION_CATALOG.find((candidate) => extensionRefKey(candidate) === key);
    if (!manifest) {
      throw new AgentExtensionAccessError(
        "extension_not_enabled",
        key,
        `Extension ${key} is not installed in this Agent deployment.`,
      );
    }
    const installation = byKey.get(key);
    const status = installation?.status ?? manifest.defaultTenantStatus;
    if (status === "revoked") {
      throw new AgentExtensionAccessError(
        "extension_revoked",
        key,
        `Extension ${key} is revoked for this tenant.`,
      );
    }
    if (status !== "enabled") {
      throw new AgentExtensionAccessError(
        "extension_not_enabled",
        key,
        `Extension ${key} is not enabled for this tenant.`,
      );
    }
    if (manifest.credentialMode === "reference-required" && !installation?.credentialConfigured) {
      throw new AgentExtensionAccessError(
        "extension_credentials_required",
        key,
        `Extension ${key} requires a server-side credential reference.`,
      );
    }
  }
}

export function assertCredentialReference(value: string): void {
  if (
    value.length > 512
    || !/^(?:vault|vercel-connect):\/\/[a-zA-Z0-9][a-zA-Z0-9._~:/-]*$/u.test(value)
  ) {
    throw new Error(
      "credentialRef must be an opaque vault:// or vercel-connect:// reference, never a credential value.",
    );
  }
}
