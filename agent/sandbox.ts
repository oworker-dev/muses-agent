import {
  defaultBackend,
  defineSandbox,
} from "eve/sandbox";
import { docker } from "eve/sandbox/docker";
import { microsandbox } from "eve/sandbox/microsandbox";
import { vercel } from "eve/sandbox/vercel";
import { readAgentSandboxBackend } from "../lib/production-config.ts";

/**
 * The sandbox is an Agent capability boundary, not a convenience default.
 * Keep the backend selectable for local development and hosted deployment,
 * while applying the same deny-by-default network policy to every backend.
 */
export default defineSandbox({
  description:
    "One isolated workspace per durable Agent session with deny-by-default egress.",
  backend: selectBackend(),
  async onSession({ use, ctx }) {
    const sandbox = await use();
    await sandbox.setNetworkPolicy("deny-all");
    await sandbox.writeTextFile({
      path: "/workspace/.open-agent-session",
      content: `${ctx.session.id}\n`,
    });
  },
});

function selectBackend() {
  const selected = readAgentSandboxBackend();
  if (selected === "docker") {
    return docker({
      networkPolicy: "deny-all",
      pullPolicy: "if-not-present",
    });
  }
  if (selected === "microsandbox") {
    return microsandbox({
      cpus: 2,
      memoryMiB: 2048,
      networkPolicy: "deny-all",
      pullPolicy: "if-missing",
    });
  }
  if (selected === "vercel") {
    return vercel({
      networkPolicy: "deny-all",
      resources: { vcpus: 2 },
    });
  }
  return defaultBackend({
    docker: { networkPolicy: "deny-all", pullPolicy: "if-not-present" },
    microsandbox: {
      cpus: 2,
      memoryMiB: 2048,
      networkPolicy: "deny-all",
      pullPolicy: "if-missing",
    },
    vercel: { resources: { vcpus: 2 } },
  });
}
