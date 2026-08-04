import type { SessionContext } from "eve/context";
import { createAgentHostCapabilityClient } from "@oworker/open-agent-host/client";
import type { AgentHostInvocationIdentity } from "@oworker/open-agent-contracts/host";
import type { AgentHostCapabilityDescriptor } from "../../contracts/host-capability";
import type { JsonValue } from "../../contracts/agent-run";
import { allowedHostCapabilities, readAgentRunPolicy } from "./run-policy.ts";

// Host-owned media and workflow calls can legitimately outlive a normal chat
// turn. Keep the default inside the public upper bound so a host can still
// choose a shorter timeout for read-only capabilities.
const DEFAULT_TIMEOUT_MS = 120_000;

export function isHostCapabilityConfigured(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return Boolean(
    environment.AGENT_HOST_TOOLS_URL?.trim() &&
      environment.AGENT_HOST_TOOLS_SECRET?.trim(),
  );
}

type HostCapabilityResolverContext = {
  readonly session: {
    readonly auth: {
      readonly current?: { readonly attributes: Readonly<Record<string, unknown>> } | null;
      readonly initiator?: { readonly attributes: Readonly<Record<string, unknown>> } | null;
    };
  };
};

export function shouldExposeHostCapabilities(
  session: HostCapabilityResolverContext,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const principal = session.session.auth.initiator ?? session.session.auth.current;
  const allowed = readAgentRunPolicy(session).hostCapabilities;
  return Boolean(
    principal &&
      allowed?.length &&
      isHostCapabilityConfigured(environment),
  );
}

export async function listHostCapabilities(
  session: SessionContext,
  signal?: AbortSignal,
): Promise<readonly AgentHostCapabilityDescriptor[]> {
  const capabilities = await hostClient(session).list({ signal });
  const allowed = allowedHostCapabilities(session);
  return allowed
    ? capabilities.filter((capability) => allowed.has(capability.name))
    : capabilities;
}

export async function invokeHostCapability(
  session: SessionContext,
  input: {
    readonly capability: string;
    readonly input: Readonly<Record<string, JsonValue>>;
    readonly correlationId?: string;
  },
  signal?: AbortSignal,
): Promise<JsonValue> {
  const allowed = allowedHostCapabilities(session);
  if (allowed && !allowed.has(input.capability)) {
    throw new Error(
      `Host capability "${input.capability}" is not allowed by this AgentRun policy.`,
    );
  }
  const response = await hostClient(session).invoke({
    capability: input.capability,
    input: input.input,
    runId:
      typeof session.session.auth.current?.attributes.agentRunId === "string"
        ? session.session.auth.current.attributes.agentRunId
        : session.session.id,
    sessionId: session.session.id,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  }, { signal });
  return response.output;
}

function hostClient(session: SessionContext) {
  const baseUrl = required(process.env.AGENT_HOST_TOOLS_URL, "AGENT_HOST_TOOLS_URL");
  const secret = required(
    process.env.AGENT_HOST_TOOLS_SECRET,
    "AGENT_HOST_TOOLS_SECRET",
  );
  if (secret.length < 32) {
    throw new Error("AGENT_HOST_TOOLS_SECRET must contain at least 32 characters.");
  }
  return createAgentHostCapabilityClient({
    baseUrl,
    identity: hostIdentity(session),
    secret,
    timeoutMs: readHostCapabilityTimeoutMs(),
  });
}

function hostIdentity(session: SessionContext): AgentHostInvocationIdentity {
  const auth = session.session.auth.current;
  const tenantId = auth?.attributes.tenantId;
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new Error("A tenant-scoped authenticated Agent session is required for Host capabilities.");
  }
  const principalId = auth?.subject ?? auth?.principalId;
  if (typeof principalId !== "string" || !principalId.trim()) {
    throw new Error("An authenticated Agent principal is required for Host capabilities.");
  }
  const scope = parseScopeAttribute(auth?.attributes.agentHostScope);
  return {
    actorType: auth?.attributes.actorType === "service" ? "service" : "user",
    principalId,
    tenantId,
    ...(scope ? { scope } : {}),
  };
}

function parseScopeAttribute(value: unknown): Readonly<Record<string, string>> | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    if (!Object.values(parsed).every((item) => typeof item === "string")) return undefined;
    return parsed as Readonly<Record<string, string>>;
  } catch {
    return undefined;
  }
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required for Host capabilities.`);
  return normalized;
}

export function readHostCapabilityTimeoutMs(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const raw = environment.AGENT_HOST_TOOLS_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 120_000) {
    throw new Error("AGENT_HOST_TOOLS_TIMEOUT_MS must be an integer from 1000 to 120000.");
  }
  return parsed;
}
