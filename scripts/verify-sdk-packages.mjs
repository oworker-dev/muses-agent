import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspaceRoot = new URL("../", import.meta.url).pathname;
const temporaryRoot = await mkdtemp(join(tmpdir(), "muses-agent-sdk-"));
const packageDirectory = join(temporaryRoot, "packages");
const consumerDirectory = join(temporaryRoot, "consumer");
const pnpmConsumerDirectory = join(temporaryRoot, "pnpm-consumer");

try {
  await Promise.all([
    mkdir(packageDirectory, { recursive: true }),
    mkdir(consumerDirectory, { recursive: true }),
    mkdir(pnpmConsumerDirectory, { recursive: true }),
  ]);
  for (const workspace of [
    "@muses/agent-contracts",
    "@muses/agent-client",
    "@muses/agent-host",
    "@muses/agent-ui",
  ]) {
    execFileSync(
      "npm",
      ["pack", "--silent", "--workspace", workspace, "--pack-destination", packageDirectory],
      { cwd: workspaceRoot, stdio: "pipe" },
    );
  }

  const archives = (await readdir(packageDirectory))
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(packageDirectory, file));
  assert.equal(archives.length, 4, "Expected one archive for each public SDK package.");

  await writeFile(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ name: "agent-sdk-conformance-consumer", private: true, type: "module" }),
  );
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...archives], {
    cwd: consumerDirectory,
    stdio: "pipe",
  });

  const probe = `
    import assert from "node:assert/strict";
    import { AGENT_RUN_CONTRACT_VERSION } from "@muses/agent-contracts";
    import { AGENT_SESSION_CONTRACT_VERSION } from "@muses/agent-contracts/agent-session";
    import { AGENT_EMBED_CONTRACT_VERSION } from "@muses/agent-contracts/embed";
    import { AGENT_CLIENT_VERSION, createAgentRunClient } from "@muses/agent-client";
    import { AGENT_HOST_SIGNATURE_VERSION, signAgentHostCapabilityRequest } from "@muses/agent-host";
    import { AGENT_UI_VERSION, AgentWorkspace } from "@muses/agent-ui";
    import { Conversation } from "@muses/agent-ui/ai-elements/conversation";
    import { Context, ModelSelector } from "@muses/agent-ui/ai-elements";
    import { Button } from "@muses/agent-ui/ui/button";
    assert.equal(AGENT_RUN_CONTRACT_VERSION, "0.1.0-draft");
    assert.equal(AGENT_SESSION_CONTRACT_VERSION, "0.1.0-draft");
    assert.equal(AGENT_EMBED_CONTRACT_VERSION, "0.1.0");
    assert.equal(AGENT_CLIENT_VERSION, "0.1.0-alpha.8");
    assert.equal(AGENT_HOST_SIGNATURE_VERSION, "0.2.0");
    assert.equal(AGENT_UI_VERSION, "0.1.0-alpha.8");
    assert.equal(typeof createAgentRunClient, "function");
    assert.equal(typeof signAgentHostCapabilityRequest, "function");
    assert.equal(typeof AgentWorkspace, "function");
    assert.equal(typeof Conversation, "function");
    assert.equal(typeof Context, "function");
    assert.equal(typeof ModelSelector, "function");
    assert.equal(typeof Button, "function");
    assert.match(import.meta.resolve("@muses/agent-ui/styles.css"), /styles\.css$/);
  `;
  execFileSync("node", ["--input-type=module", "--eval", probe], {
    cwd: consumerDirectory,
    stdio: "pipe",
  });

  await writeFile(
    join(pnpmConsumerDirectory, "package.json"),
    JSON.stringify({ name: "agent-sdk-pnpm-conformance-consumer", private: true, type: "module" }),
  );
  execFileSync("pnpm", ["add", "--ignore-scripts", ...archives], {
    cwd: pnpmConsumerDirectory,
    stdio: "pipe",
  });
  execFileSync("node", ["--input-type=module", "--eval", probe], {
    cwd: pnpmConsumerDirectory,
    stdio: "pipe",
  });

  process.stdout.write(
    JSON.stringify({
      archives: archives.map((path) => path.split("/").at(-1)),
      consumers: ["npm", "pnpm"],
      ok: true,
    }) + "\n",
  );
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
