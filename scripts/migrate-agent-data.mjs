import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.AGENT_DATABASE_URL?.trim();
if (!connectionString) throw new Error("AGENT_DATABASE_URL is required.");

const schema = process.env.AGENT_DATABASE_SCHEMA?.trim() || "muses_agent";
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
  throw new Error("AGENT_DATABASE_SCHEMA must be a valid PostgreSQL identifier.");
}

const migrationUrl = new URL(
  "../server/data/migrations/0001_agent_service.sql",
  import.meta.url,
);
const source = await readFile(fileURLToPath(migrationUrl), "utf8");
const sql = source.replaceAll("__AGENT_SCHEMA__", schema);
const pool = new pg.Pool({ application_name: "muses-agent-migrate", connectionString, max: 1 });

try {
  await pool.query(sql);
  console.log(`Agent data schema ${schema} is ready.`);
} finally {
  await pool.end();
}
