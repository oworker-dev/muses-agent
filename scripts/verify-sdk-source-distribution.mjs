import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const workspaceRoot = new URL("../", import.meta.url).pathname;
const distributionPaths = [
  "packages/agent-contracts/dist",
  "packages/agent-client/dist",
  "packages/agent-host/dist",
  "packages/agent-ui/dist",
];
const requiredEntrypoints = distributionPaths.map((path) => `${path}/index.js`);

const trackedFiles = execFileSync("git", ["ls-files", "--", ...distributionPaths], {
  cwd: workspaceRoot,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

for (const entrypoint of requiredEntrypoints) {
  assert.ok(trackedFiles.includes(entrypoint), `${entrypoint} must be committed for Git installs.`);
}

const status = execFileSync(
  "git",
  ["status", "--porcelain=v1", "--untracked-files=all", "--", ...distributionPaths],
  { cwd: workspaceRoot, encoding: "utf8" },
).trim();

assert.equal(
  status,
  "",
  `SDK distribution files differ from the committed source:\n${status}`,
);

process.stdout.write(
  JSON.stringify({ trackedFiles: trackedFiles.length, paths: distributionPaths, ok: true }) + "\n",
);
