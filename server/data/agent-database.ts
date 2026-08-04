import { Pool } from "pg";

export type AgentDatabaseConfig = {
  readonly connectionString: string;
  readonly maxPoolSize: number;
  readonly schema: string;
};

const DEFAULT_SCHEMA = "open_agent";
const globalAgentDatabase = globalThis as typeof globalThis & {
  __musesAgentDatabasePools?: Map<string, Pool>;
};

export function readAgentDatabaseConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentDatabaseConfig | undefined {
  const connectionString = environment.AGENT_DATABASE_URL?.trim();
  if (!connectionString) return undefined;

  const schema = environment.AGENT_DATABASE_SCHEMA?.trim() || DEFAULT_SCHEMA;
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
    throw new Error("AGENT_DATABASE_SCHEMA must be a valid PostgreSQL identifier.");
  }

  const configuredMax = environment.AGENT_DATABASE_MAX_POOL_SIZE?.trim();
  const maxPoolSize = configuredMax ? Number(configuredMax) : 10;
  if (!Number.isInteger(maxPoolSize) || maxPoolSize < 1 || maxPoolSize > 100) {
    throw new Error("AGENT_DATABASE_MAX_POOL_SIZE must be an integer from 1 to 100.");
  }

  return { connectionString, maxPoolSize, schema };
}

export function getAgentDatabasePool(config: AgentDatabaseConfig): Pool {
  const key = `${config.connectionString}\u0000${config.maxPoolSize}`;
  const pools = globalAgentDatabase.__musesAgentDatabasePools ??= new Map();
  const existing = pools.get(key);
  if (existing) return existing;

  const pool = new Pool({
    application_name: "open-agent",
    connectionString: config.connectionString,
    max: config.maxPoolSize,
  });
  pools.set(key, pool);
  return pool;
}

export async function closeAgentDatabasePools(): Promise<void> {
  const pools = globalAgentDatabase.__musesAgentDatabasePools;
  if (!pools) return;
  globalAgentDatabase.__musesAgentDatabasePools = new Map();
  await Promise.all([...pools.values()].map((pool) => pool.end()));
}

export function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error("Unsafe PostgreSQL identifier.");
  }
  return `"${identifier}"`;
}
