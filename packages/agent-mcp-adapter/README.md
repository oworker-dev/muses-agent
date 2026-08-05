# `@oworker/open-agent-mcp-adapter`

This package is a host-neutral factory for a reviewed, build-time Eve MCP
connection. It does not dynamically turn administrator metadata into network
code.

A deployment imports the factory from its own `agent/connections/*.ts`, passes one exact
adapter id/version, HTTPS MCP endpoint, compile-reviewed tool allowlist, write
tool approval list, and private credential-broker endpoint. The broker resolves
tenant installation state and an opaque credential reference into a short-lived
bearer token. Neither the reference nor token enters the AgentRun policy, model
context, tool input, event stream, or sandbox.

```ts
import { createBrokeredMcpConnection } from "@oworker/open-agent-mcp-adapter";

export default createBrokeredMcpConnection({
  adapter: { id: "company-mcp", version: "1.0.0" },
  broker: {
    getServiceToken: () => process.env.AGENT_MCP_BROKER_TOKEN!,
    url: process.env.AGENT_MCP_BROKER_URL!,
  },
  connection: {
    description: "Reviewed company knowledge and publishing tools.",
    displayName: "Company tools",
    endpoint: "https://mcp.example.com/mcp",
    tools: {
      allow: ["search", "get_document", "publish_document"],
      requireApproval: ["publish_document"],
    },
  },
});
```

The consuming deployment must also publish the same adapter id/version in its
static compiled extension catalog. Runtime Config may enable that exact entry,
but may not replace its endpoint, tool allowlist, authorization, or approval
code. The connection filename becomes its Eve namespace. The standalone Open
Agent application intentionally imports no adapter, so it exposes no
`connection_search` tool until a deployment opts in.

The private broker receives this bounded JSON body:

```json
{
  "adapter": { "id": "company-mcp", "version": "1.0.0" },
  "contractVersion": "0.1.0",
  "sessionId": "eve-session-id",
  "subject": {
    "actorType": "user",
    "principalId": "authenticated-principal",
    "tenantId": "authenticated-tenant"
  }
}
```

It returns `{ "token": "...", "expiresAt": 1780000000000 }`. The response is
limited to 16 KiB. The broker service token is carried only in its private
`Authorization` header and is resolved at runtime, not during the Agent build.
The adapter checks tenant continuity and the initiating
AgentRun's exact `id@version` grant before contacting the broker. Broker errors
are reduced to stable authorization reasons before they reach the Agent.

Run `npm run verify:mcp-conformance` at the repository root for the real
Streamable HTTP allowlist, approval/resume, revocation, and secret-leakage gate.
Interactive third-party OAuth is intentionally outside this brokered credential
contract and requires its own provider-specific production evidence.
