import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentHostCapabilityAuthError,
  createAgentHostCapabilityClient,
  createAgentHostCapabilityRegistry,
  signAgentHostCapabilityRequest,
  verifyAgentHostCapabilityRequest,
} from "@muses/agent-host";

const SECRET = "host-capability-secret-32-characters-minimum";
const NOW = 1_786_000_000_000;
const IDENTITY = {
  actorType: "service",
  canvasId: "canvas-1",
  principalId: "user-1",
  projectId: "project-1",
  tenantId: "workspace-1",
} as const;

test("Host SDK signs and verifies one scoped capability request", () => {
  const body = JSON.stringify({ capability: "canvas.inspect" });
  const headers = signAgentHostCapabilityRequest({
    body,
    identity: IDENTITY,
    method: "post",
    secret: SECRET,
    timestamp: NOW,
    url: "https://host.example/capabilities/invoke?ignored=1",
  });
  const verified = verifyAgentHostCapabilityRequest({
    body,
    headers,
    method: "POST",
    now: NOW,
    secret: SECRET,
    url: "https://host.example/capabilities/invoke?another=2",
  });
  assert.deepEqual(verified, IDENTITY);
});

test("Host SDK rejects tampering, stale requests, and invalid scope", () => {
  const headers = signAgentHostCapabilityRequest({
    identity: { ...IDENTITY, canvasId: undefined },
    method: "GET",
    secret: SECRET,
    timestamp: NOW,
    url: "https://host.example/capabilities",
  });
  assert.throws(
    () => verifyAgentHostCapabilityRequest({
      body: "tampered",
      headers,
      method: "GET",
      now: NOW,
      secret: SECRET,
      url: "https://host.example/capabilities",
    }),
    (error: unknown) => error instanceof AgentHostCapabilityAuthError
      && error.code === "host-capability-signature-invalid",
  );
  assert.throws(
    () => verifyAgentHostCapabilityRequest({
      headers,
      method: "GET",
      now: NOW + 60_001,
      secret: SECRET,
      url: "https://host.example/capabilities",
    }),
    (error: unknown) => error instanceof AgentHostCapabilityAuthError
      && error.code === "host-capability-auth-expired",
  );
  assert.throws(
    () => signAgentHostCapabilityRequest({
      identity: { actorType: "user", canvasId: "canvas-1", principalId: "user-1", tenantId: "workspace-1" },
      method: "GET",
      secret: SECRET,
      url: "https://host.example/capabilities",
    }),
    (error: unknown) => error instanceof AgentHostCapabilityAuthError
      && error.code === "host-capability-project-required",
  );
});

test("Host SDK client rotates scope and validates capability responses", async () => {
  let identityReads = 0;
  const requests: Array<{ headers: Headers; redirect?: RequestRedirect }> = [];
  const client = createAgentHostCapabilityClient({
    baseUrl: "https://host.example/agent-tools",
    fetch: async (_url, init) => {
      requests.push({ headers: new Headers(init?.headers), redirect: init?.redirect });
      return Response.json({
        capabilities: [{
          description: "Inspect the canvas.",
          inputSchema: {},
          name: "canvas.inspect",
          requiredPermissions: ["canvas.read"],
          sideEffect: "none",
          version: "0.1.0-draft",
        }],
        contractVersion: "0.1.0-draft",
      });
    },
    identity: async () => ({ ...IDENTITY, projectId: `project-${++identityReads}`, canvasId: undefined }),
    now: () => NOW,
    secret: SECRET,
  });

  const capabilities = await client.list();
  assert.equal(capabilities[0]?.name, "canvas.inspect");
  assert.equal(requests[0]?.headers.get("x-agent-host-project"), "project-1");
  assert.equal(requests[0]?.redirect, "error");
});

test("Host SDK registry sorts descriptors and isolates host execution context", async () => {
  const registry = createAgentHostCapabilityRegistry<{ actor: string }>([
    {
      descriptor: descriptor("workflow.invoke"),
      invoke: (_input, context) => ({ actor: context.actor }),
    },
    {
      descriptor: descriptor("canvas.inspect"),
      invoke: () => ({ items: 2 }),
      validate: (input): input is Readonly<Record<string, never>> => Object.keys(input as object).length === 0,
    },
  ]);
  assert.deepEqual(registry.list().map((item) => item.name), ["canvas.inspect", "workflow.invoke"]);
  assert.deepEqual(await registry.invoke("workflow.invoke", {}, { actor: "user-1" }), { actor: "user-1" });
  await assert.rejects(() => registry.invoke("canvas.inspect", { unexpected: true }, { actor: "user-1" }));
});

function descriptor(name: string) {
  return {
    description: name,
    inputSchema: {},
    name,
    requiredPermissions: [],
    sideEffect: "none",
    version: "0.1.0-draft",
  } as const;
}
