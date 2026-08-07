import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, QueryResult } from "pg";

import {
  createPostgresThreadCollectionStore,
  normalizeJsonbValue,
} from "../../server/data/thread-collection-store.ts";

const config = {
  connectionString: "postgresql://unused",
  maxPoolSize: 1,
  schema: "open_agent_test",
} as const;

test("saves a thread event containing NUL through the PostgreSQL JSONB boundary", async () => {
  const original = {
    threads: [{
      events: [{
        data: {
          output: {
            content: "binary\u0000payload",
            nested: ["valid", { text: "第二页\u0000完成" }],
          },
        },
        type: "action.result",
      }],
      id: "thread-1",
    }],
    version: 2,
  };
  let persisted: typeof original | undefined;
  const pool = {
    async query(_sql: string, parameters?: readonly unknown[]) {
      const serialized = parameters?.[3];
      assert.equal(typeof serialized, "string");
      assert.doesNotMatch(serialized as string, /\u0000/u);
      persisted = JSON.parse(serialized as string) as typeof original;
      return {
        rows: [{ collection: persisted, revision: "1" }],
      } as unknown as QueryResult;
    },
  } as unknown as Pool;
  const store = createPostgresThreadCollectionStore<typeof original>(config, pool);

  const result = await store.save("tenant-1", "principal-1", "workspace-1", 0, original);

  assert.equal(result.status, "saved");
  assert.deepEqual(persisted?.threads[0]?.events[0]?.data.output, {
    content: "binary\uFFFDpayload",
    nested: ["valid", { text: "第二页\uFFFD完成" }],
  });
  assert.equal(original.threads[0]?.events[0]?.data.output.content, "binary\u0000payload");
});

test("normalizes nested JSONB strings without changing normal Unicode or caller data", () => {
  const original = {
    normal: "Muses 设计平台",
    values: ["alpha", "unpaired:\uD800", { content: "before\u0000after" }],
  };

  const normalized = normalizeJsonbValue(original);

  assert.notEqual(normalized, original);
  assert.notEqual(normalized.values, original.values);
  assert.equal(normalized.normal, original.normal);
  assert.equal(normalized.values[0], "alpha");
  assert.equal(normalized.values[1], "unpaired:\uFFFD");
  assert.deepEqual(normalized.values[2], { content: "before\uFFFDafter" });
  assert.equal(original.values[1], "unpaired:\uD800");
  assert.deepEqual(original.values[2], { content: "before\u0000after" });
});
