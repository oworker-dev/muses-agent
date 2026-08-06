import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveProductionPreviewSigningSecret } from "../../scripts/production-preview-secret.mjs";

test("production preview creates one private signing secret and reuses it", async () => {
  const root = await mkdtemp(join(tmpdir(), "open-agent-preview-secret-"));
  const path = join(root, "nested", "signing-secret");
  try {
    const first = await resolveProductionPreviewSigningSecret({ environment: {}, secretFile: path });
    const second = await resolveProductionPreviewSigningSecret({ environment: {}, secretFile: path });
    assert.equal(second, first);
    assert.equal((await readFile(path, "utf8")).trim(), first);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("an injected production secret takes precedence without touching the fallback file", async () => {
  const root = await mkdtemp(join(tmpdir(), "open-agent-preview-secret-"));
  const path = join(root, "unused-secret");
  const configured = "configured-preview-secret-at-least-32-bytes";
  try {
    assert.equal(await resolveProductionPreviewSigningSecret({
      environment: { AGENT_PREVIEW_SIGNING_SECRET: configured },
      secretFile: path,
    }), configured);
    await assert.rejects(stat(path), (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "ENOENT");
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("production preview fails closed on a damaged persisted secret", async () => {
  const root = await mkdtemp(join(tmpdir(), "open-agent-preview-secret-"));
  const path = join(root, "signing-secret");
  try {
    await writeFile(path, "short\n", { mode: 0o600 });
    await assert.rejects(
      resolveProductionPreviewSigningSecret({ environment: {}, secretFile: path }),
      /at least 32 bytes/u,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
