import assert from "node:assert/strict";
import test from "node:test";

import { resolveStandaloneStorageMode } from "../../lib/standalone-storage-mode.ts";

test("standalone development uses browser storage when PostgreSQL is absent", () => {
  assert.equal(resolveStandaloneStorageMode({ NODE_ENV: "development" }), "browser");
});

test("standalone development uses server storage when PostgreSQL is configured", () => {
  assert.equal(resolveStandaloneStorageMode({
    AGENT_DATABASE_URL: "postgresql://agent.example/open_agent",
    NODE_ENV: "development",
  }), "server");
});

test("standalone production never silently falls back to browser-only storage", () => {
  assert.equal(resolveStandaloneStorageMode({ NODE_ENV: "production" }), "server");
});
