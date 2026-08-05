import { spawnSync } from "node:child_process";

const image = process.env.AGENT_SANDBOX_IMAGE?.trim();
if (!image) throw new Error("AGENT_SANDBOX_IMAGE is required.");
if (!/@sha256:[a-f0-9]{64}$/.test(image)) {
  throw new Error("AGENT_SANDBOX_IMAGE must be pinned by sha256 digest.");
}

const commands = [
  "node --version",
  "npm --version",
  "python3 --version",
  "git --version",
  "ffmpeg -version",
  "convert -version",
  "playwright --version",
];
const result = spawnSync(
  process.env.EVE_DOCKER_PATH?.trim() || "docker",
  ["run", "--rm", "--network", "none", "--entrypoint", "/bin/bash", image, "-lc", commands.join(" && ")],
  { encoding: "utf8", stdio: "pipe" },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Sandbox runtime verification failed.\n");
  process.exitCode = result.status ?? 1;
} else {
  process.stdout.write(result.stdout);
}
