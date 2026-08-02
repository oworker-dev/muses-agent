import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import type { AgentRunPolicy } from "../../contracts/agent-run.ts";
import {
  AGENT_EXTENSION_CATALOG,
  extensionRefKey,
  type AgentExtensionKind,
  type AgentExtensionManifest,
} from "../../lib/agent-extension-catalog.ts";
import {
  assertAgentRunExtensionsEnabled,
  assertCredentialReference,
  type AgentExtensionInstallation,
} from "../../lib/agent-extension-lifecycle.ts";
import {
  getAgentDatabasePool,
  quoteIdentifier,
  readAgentDatabaseConfig,
  type AgentDatabaseConfig,
} from "./agent-database.ts";

export type AgentExtensionView = AgentExtensionManifest & {
  readonly credentialConfigured: boolean;
  readonly effectiveStatus: "disabled" | "enabled" | "revoked";
  readonly explicitlyConfigured: boolean;
  readonly updatedAt?: string;
};

export interface AgentExtensionStore {
  assertPolicyAllowed(tenantId: string, policy: AgentRunPolicy): Promise<void>;
  enable(input: {
    readonly actorId: string;
    readonly credentialRef?: string;
    readonly id: string;
    readonly tenantId: string;
    readonly version: string;
  }): Promise<AgentExtensionView>;
  list(tenantId: string): Promise<readonly AgentExtensionView[]>;
  revoke(input: {
    readonly actorId: string;
    readonly id: string;
    readonly tenantId: string;
    readonly version: string;
  }): Promise<AgentExtensionView>;
}

export function createPostgresAgentExtensionStore(
  config: AgentDatabaseConfig,
): AgentExtensionStore {
  const pool = getAgentDatabasePool(config);
  const installations = `${quoteIdentifier(config.schema)}."agent_extension_installations"`;
  const audit = `${quoteIdentifier(config.schema)}."agent_extension_audit_events"`;
  return postgresAgentExtensionStore(pool, installations, audit);
}

export function createPostgresAgentExtensionStoreFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentExtensionStore | undefined {
  const config = readAgentDatabaseConfig(environment);
  return config ? createPostgresAgentExtensionStore(config) : undefined;
}

function postgresAgentExtensionStore(
  pool: Pool,
  installationsTable: string,
  auditTable: string,
): AgentExtensionStore {
  const readInstallations = async (tenantId: string): Promise<readonly StoredInstallation[]> => {
    assertText(tenantId, "tenantId", 512);
    const result = await pool.query<StoredInstallationRow>(
      `select extension_id, extension_version, kind, status,
              credential_ref is not null as credential_configured,
              updated_at::text
         from ${installationsTable}
        where tenant_id = $1`,
      [tenantId],
    );
    return result.rows.map(toStoredInstallation);
  };

  const mutate = async (input: {
    readonly actorId: string;
    readonly credentialRef?: string;
    readonly id: string;
    readonly status: "enabled" | "revoked";
    readonly tenantId: string;
    readonly version: string;
  }): Promise<AgentExtensionView> => {
    assertText(input.actorId, "actorId", 512);
    assertText(input.tenantId, "tenantId", 512);
    const manifest = requireManifest(input.id, input.version);
    if (input.credentialRef) assertCredentialReference(input.credentialRef);
    if (manifest.credentialMode === "none" && input.credentialRef) {
      throw new Error(`Extension ${extensionRefKey(manifest)} does not accept a credential reference.`);
    }
    if (
      input.status === "enabled"
      && manifest.credentialMode === "reference-required"
      && !input.credentialRef
    ) {
      throw new Error(`Extension ${extensionRefKey(manifest)} requires a credential reference.`);
    }

    return withTransaction(pool, async (client) => {
      const before = await client.query<StoredInstallationRow>(
        `select extension_id, extension_version, kind, status,
                credential_ref is not null as credential_configured,
                updated_at::text
           from ${installationsTable}
          where tenant_id = $1 and extension_id = $2 and extension_version = $3
          for update`,
        [input.tenantId, input.id, input.version],
      );
      const result = await client.query<StoredInstallationRow>(
        `insert into ${installationsTable}
          (tenant_id, extension_id, extension_version, kind, status, credential_ref,
           configured_by, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())
         on conflict (tenant_id, extension_id, extension_version) do update
           set status = excluded.status,
               credential_ref = case
                 when excluded.status = 'revoked' then null
                 else excluded.credential_ref
               end,
               configured_by = excluded.configured_by,
               updated_at = now()
         returning extension_id, extension_version, kind, status,
                   credential_ref is not null as credential_configured,
                   updated_at::text`,
        [
          input.tenantId,
          manifest.id,
          manifest.version,
          manifest.kind,
          input.status,
          input.status === "enabled" ? input.credentialRef ?? null : null,
          input.actorId,
        ],
      );
      const stored = toStoredInstallation(requireRow(result.rows[0]));
      await client.query(
        `insert into ${auditTable}
          (event_id, tenant_id, extension_id, extension_version, kind, action,
           actor_id, before_state, after_state)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
        [
          `aext_${randomUUID()}`,
          input.tenantId,
          manifest.id,
          manifest.version,
          manifest.kind,
          input.status === "enabled" ? "enabled" : "revoked",
          input.actorId,
          before.rows[0]
            ? JSON.stringify(auditState(toStoredInstallation(before.rows[0])))
            : null,
          JSON.stringify(auditState(stored)),
        ],
      );
      return toView(manifest, stored);
    });
  };

  return {
    async assertPolicyAllowed(tenantId, policy) {
      assertAgentRunExtensionsEnabled(policy, await readInstallations(tenantId));
    },
    async enable(input) {
      return mutate({ ...input, status: "enabled" });
    },
    async list(tenantId) {
      const byKey = new Map(
        (await readInstallations(tenantId)).map((item) => [extensionRefKey(item), item]),
      );
      return AGENT_EXTENSION_CATALOG.map((manifest) => toView(manifest, byKey.get(extensionRefKey(manifest))));
    },
    async revoke(input) {
      return mutate({ ...input, status: "revoked" });
    },
  };
}

type StoredInstallation = AgentExtensionInstallation & { readonly updatedAt: string };
type StoredInstallationRow = {
  readonly credential_configured: boolean;
  readonly extension_id: string;
  readonly extension_version: string;
  readonly kind: AgentExtensionKind;
  readonly status: "enabled" | "revoked";
  readonly updated_at: string;
};

function toStoredInstallation(row: StoredInstallationRow): StoredInstallation {
  return {
    credentialConfigured: row.credential_configured,
    id: row.extension_id,
    kind: row.kind,
    status: row.status,
    updatedAt: row.updated_at,
    version: row.extension_version,
  };
}

function toView(
  manifest: AgentExtensionManifest,
  stored?: StoredInstallation,
): AgentExtensionView {
  return {
    ...manifest,
    credentialConfigured: stored?.credentialConfigured ?? false,
    effectiveStatus: stored?.status ?? manifest.defaultTenantStatus,
    explicitlyConfigured: Boolean(stored),
    ...(stored ? { updatedAt: stored.updatedAt } : {}),
  };
}

function auditState(stored: StoredInstallation) {
  return {
    credentialConfigured: stored.credentialConfigured,
    status: stored.status,
  };
}

function requireManifest(id: string, version: string): AgentExtensionManifest {
  const manifest = AGENT_EXTENSION_CATALOG.find(
    (candidate) => candidate.id === id && candidate.version === version,
  );
  if (!manifest) throw new Error(`Extension ${id}@${version} is not installed in this deployment.`);
  return manifest;
}

function assertText(value: string, name: string, maximum: number): void {
  if (!value.trim() || value.length > maximum) {
    throw new Error(`${name} must contain between 1 and ${maximum} characters.`);
  }
}

function requireRow<T>(value: T | undefined): T {
  if (!value) throw new Error("The extension installation write did not return a row.");
  return value;
}

async function withTransaction<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
