import type { Pool } from "pg";
import {
  getAgentDatabasePool,
  quoteIdentifier,
  readAgentDatabaseConfig,
  type AgentDatabaseConfig,
} from "./agent-database.ts";

export type StoredThreadCollection<TCollection> = {
  readonly collection: TCollection;
  readonly revision: number;
};

export type ThreadCollectionWriteResult<TCollection> =
  | { readonly record: StoredThreadCollection<TCollection>; readonly status: "saved" }
  | { readonly currentRevision: number; readonly status: "conflict" };

export interface AgentThreadCollectionStore<TCollection = unknown> {
  load(
    tenantId: string,
    principalId: string,
    storageKey: string,
  ): Promise<StoredThreadCollection<TCollection> | undefined>;
  save(
    tenantId: string,
    principalId: string,
    storageKey: string,
    expectedRevision: number,
    collection: TCollection,
  ): Promise<ThreadCollectionWriteResult<TCollection>>;
}

export function createPostgresThreadCollectionStore<TCollection = unknown>(
  config: AgentDatabaseConfig,
  pool: Pool = getAgentDatabasePool(config),
): AgentThreadCollectionStore<TCollection> {
  const table = `${quoteIdentifier(config.schema)}."agent_thread_collections"`;
  return postgresThreadCollectionStore<TCollection>(pool, table);
}

export function createPostgresThreadCollectionStoreFromEnvironment<TCollection = unknown>(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentThreadCollectionStore<TCollection> | undefined {
  const config = readAgentDatabaseConfig(environment);
  return config ? createPostgresThreadCollectionStore<TCollection>(config) : undefined;
}

function postgresThreadCollectionStore<TCollection>(
  pool: Pool,
  table: string,
): AgentThreadCollectionStore<TCollection> {
  const load = async (
    tenantId: string,
    principalId: string,
    storageKey: string,
  ): Promise<StoredThreadCollection<TCollection> | undefined> => {
    assertScope(tenantId, principalId, storageKey);
    const result = await pool.query<{ collection: TCollection; revision: string }>(
      `select collection, revision::text
         from ${table}
        where tenant_id = $1 and principal_id = $2 and storage_key = $3`,
      [tenantId, principalId, storageKey],
    );
    const row = result.rows[0];
    return row
      ? { collection: row.collection, revision: parseRevision(row.revision) }
      : undefined;
  };

  return {
    load,
    async save(tenantId, principalId, storageKey, expectedRevision, collection) {
      assertScope(tenantId, principalId, storageKey);
      assertRevision(expectedRevision);
      const normalized = normalizeJsonbValue(collection);
      const serialized = JSON.stringify(normalized);
      if (serialized === undefined) throw new Error("Thread collection must be JSON serializable.");

      const result = expectedRevision === 0
        ? await pool.query<{ collection: TCollection; revision: string }>(
            `insert into ${table}
              (tenant_id, principal_id, storage_key, revision, collection)
             values ($1, $2, $3, 1, $4::jsonb)
             on conflict (tenant_id, principal_id, storage_key) do nothing
             returning collection, revision::text`,
            [tenantId, principalId, storageKey, serialized],
          )
        : await pool.query<{ collection: TCollection; revision: string }>(
            `update ${table}
                set collection = $5::jsonb,
                    revision = revision + 1,
                    updated_at = now()
              where tenant_id = $1 and principal_id = $2 and storage_key = $3
                and revision = $4
             returning collection, revision::text`,
            [tenantId, principalId, storageKey, expectedRevision, serialized],
          );

      const saved = result.rows[0];
      if (saved) {
        return {
          record: { collection: saved.collection, revision: parseRevision(saved.revision) },
          status: "saved",
        };
      }

      const current = await load(tenantId, principalId, storageKey);
      return { currentRevision: current?.revision ?? 0, status: "conflict" };
    },
  };
}

export function normalizeJsonbValue<T>(value: T): T {
  if (typeof value === "string") {
    return value.toWellFormed().replaceAll("\u0000", "\uFFFD") as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonbValue(entry)) as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJsonbValue(entry)]),
    ) as T;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertScope(tenantId: string, principalId: string, storageKey: string): void {
  assertText(tenantId, "tenantId", 512);
  assertText(principalId, "principalId", 512);
  assertText(storageKey, "storageKey", 200);
}

function assertText(value: string, name: string, maximum: number): void {
  if (value.trim().length === 0 || value.length > maximum) {
    throw new Error(`${name} must contain between 1 and ${maximum} characters.`);
  }
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("expectedRevision must be a non-negative safe integer.");
  }
}

function parseRevision(value: string): number {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Stored thread collection revision exceeds the supported range.");
  }
  return revision;
}
