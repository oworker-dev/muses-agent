import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createArtifactStoreFromEnvironment,
  MAX_ARTIFACT_BYTES,
} from "../../server/data/artifact-store.ts";

test("filesystem artifact store persists owner metadata and bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "open-agent-artifacts-"));
  try {
    const store = createArtifactStoreFromEnvironment({ AGENT_ARTIFACT_STORAGE_PATH: root });
    const record = await store.create({
      artifactId: "art_123e4567-e89b-12d3-a456-426614174000",
      content: new TextEncoder().encode("hello"),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      filename: "result.txt",
      mediaType: "text/plain; charset=utf-8",
      principalId: "user-1",
      sessionId: "session-1",
      tenantId: "tenant-1",
    });
    assert.equal(record.totalBytes, 5);
    assert.deepEqual(await store.read(record.artifactId), {
      content: Buffer.from("hello"),
      filename: "result.txt",
      mediaType: "text/plain; charset=utf-8",
    });
    assert.equal((await store.find(record.artifactId))?.tenantId, "tenant-1");
    await assert.rejects(
      store.create({
        content: new Uint8Array(MAX_ARTIFACT_BYTES + 1),
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        filename: "too-large.bin",
        mediaType: "application/octet-stream",
        principalId: "user-1",
        sessionId: "session-1",
        tenantId: "tenant-1",
      }),
      /25 MiB/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
