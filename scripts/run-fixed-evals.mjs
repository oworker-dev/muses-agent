import { spawn } from "node:child_process";
import { resolve } from "node:path";

const executable = resolve("node_modules/eve/bin/eve.js");
const environment = {
  ...process.env,
  AGENT_BASH_APPROVAL_MODE: "risky",
  AGENT_DATABASE_URL: "",
  AGENT_EVAL_CONTEXT_WINDOW_TOKENS: "4096",
  AGENT_EVAL_FIXTURE_MODEL: "autonomy-v1",
  AGENT_HOST_JWT_AUDIENCE: "",
  AGENT_HOST_JWT_ISSUER: "",
  AGENT_HOST_JWT_SECRET: "",
  AGENT_HOST_TOOLS_SECRET: "",
  AGENT_HOST_TOOLS_URL: "",
  AGENT_SANDBOX_BACKEND: process.env.FIXED_EVAL_SANDBOX_BACKEND?.trim() || "docker",
};

const child = spawn(process.execPath, [
  executable,
  "eval",
  "fixed",
  "--strict",
  "--max-concurrency",
  "1",
  "--junit",
  ".eve/fixed-evals.junit.xml",
  ...process.argv.slice(2),
], {
  env: environment,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) console.error(`Fixed eval runner terminated by ${signal}.`);
  process.exitCode = code ?? 1;
});
