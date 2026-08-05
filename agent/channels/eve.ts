import { eveChannel } from "eve/channels/eve";
import {
  type AuthFn,
  localDev,
  vercelOidc,
} from "eve/channels/auth";
import {
  findAgentRuntimeModel,
  isAgentProfileForConfig,
  isAgentReasoningLevelForModel,
  resolveAgentRuntimeConfig,
  serializeAgentRuntimeConfig,
} from "../../lib/agent-runtime-config";
import {
  agentExtensionCatalogForConfig,
  resolveAgentRunPolicy,
} from "../../lib/agent-extension-catalog";
import type { AgentRunPolicy } from "../../contracts/agent-run";
import { createPostgresSessionOwnershipStoreFromEnvironment } from "../../server/data/session-ownership-store";
import { createPostgresAgentExtensionStoreFromEnvironment } from "../../server/data/agent-extension-store";
import { hostJwtAuthFromEnvironment } from "../lib/host-auth";
import { withSessionOwnership } from "../lib/session-ownership-auth";
import { parseAgentRunPolicy } from "../lib/run-policy";
import { parseRemoteTraceParent } from "../lib/observability";

const MODEL_HEADER = "x-agent-model";
const REASONING_HEADER = "x-agent-reasoning";
const EXECUTION_MODE_HEADER = "x-agent-execution-mode";
const PROFILE_ID_HEADER = "x-agent-profile-id";
const PROFILE_VERSION_HEADER = "x-agent-profile-version";
const RUN_POLICY_HEADER = "x-agent-run-policy";
const RUN_ID_HEADER = "x-agent-run-id";
const CORRELATION_ID_HEADER = "x-agent-correlation-id";
const TRACE_PARENT_HEADER = "traceparent";
const sessionOwnershipStore = createPostgresSessionOwnershipStoreFromEnvironment();
const extensionStore = createPostgresAgentExtensionStoreFromEnvironment();

if (process.env.AGENT_HOST_JWT_SECRET?.trim() && !sessionOwnershipStore) {
  throw new Error("AGENT_DATABASE_URL is required when Host JWT authentication is enabled.");
}

function withAgentPreferences(authenticate: AuthFn<Request>): AuthFn<Request> {
  return async (request) => {
    const auth = await authenticate(request);
    if (auth == null) return null;

    const requestedModel = request.headers.get(MODEL_HEADER) ?? undefined;
    const requestedReasoning = request.headers.get(REASONING_HEADER) ?? undefined;
    const requestedExecutionMode = request.headers.get(EXECUTION_MODE_HEADER) ?? undefined;
    const attributes = { ...auth.attributes };
    const runtimeConfig = resolveAgentRuntimeConfig(attributes);
    const selectedModel = findAgentRuntimeModel(runtimeConfig, requestedModel) ??
      findAgentRuntimeModel(runtimeConfig, runtimeConfig.defaultModelId)!;

    if (requestedModel !== undefined && !findAgentRuntimeModel(runtimeConfig, requestedModel)) {
      throw new Error("The requested Agent model is not published by the active runtime config.");
    }
    attributes.agentModelId = selectedModel.id;
    if (requestedReasoning !== undefined && !isAgentReasoningLevelForModel(selectedModel, requestedReasoning)) {
      throw new Error("The requested reasoning level is not supported by the selected Agent model.");
    }
    if (isAgentReasoningLevelForModel(selectedModel, requestedReasoning)) {
      attributes.agentReasoning = requestedReasoning;
    } else {
      attributes.agentReasoning = selectedModel.defaultReasoning;
    }
    const profile = {
      profileId: request.headers.get(PROFILE_ID_HEADER)?.trim() || runtimeConfig.profile.id,
      version: request.headers.get(PROFILE_VERSION_HEADER)?.trim() || runtimeConfig.profile.version,
    };
    if (!isAgentProfileForConfig(runtimeConfig, profile)) {
      throw new Error("The Agent profile is invalid or unpublished by the active runtime config.");
    }
    attributes.agentProfileId = profile.profileId;
    attributes.agentProfileVersion = profile.version;
    attributes.agentRuntimeConfig = serializeAgentRuntimeConfig(runtimeConfig);
    const runPolicy = resolveAgentRunPolicy(
      profile,
      {
        ...parseRunPolicyHeader(request.headers.get(RUN_POLICY_HEADER)),
        ...(requestedExecutionMode ? { executionMode: parseExecutionModeHeader(requestedExecutionMode) } : {}),
      },
      undefined,
      runtimeConfig,
    );
    const tenantId = attributes.tenantId;
    if (extensionStore && typeof tenantId === "string" && tenantId.trim()) {
      await extensionStore.assertPolicyAllowed(
        tenantId,
        runPolicy,
        agentExtensionCatalogForConfig(runtimeConfig),
      );
    }
    attributes.agentRunPolicy = JSON.stringify(runPolicy);
    const agentRunId = request.headers.get(RUN_ID_HEADER)?.trim();
    if (agentRunId !== undefined && agentRunId !== "") {
      if (!/^arun_[a-zA-Z0-9-]{8,200}$/.test(agentRunId)) {
        throw new Error("The AgentRun id header is invalid.");
      }
      attributes.agentRunId = agentRunId;
    }
    const correlationId = request.headers.get(CORRELATION_ID_HEADER)?.trim();
    if (correlationId !== undefined && correlationId !== "") {
      if (!/^[a-zA-Z0-9._:-]{1,200}$/.test(correlationId)) {
        throw new Error("The Agent correlation id header is invalid.");
      }
      attributes.agentCorrelationId = correlationId;
    }
    const traceParent = request.headers.get(TRACE_PARENT_HEADER)?.trim();
    if (traceParent && parseRemoteTraceParent(traceParent)) {
      attributes.agentUpstreamTraceParent = traceParent.toLowerCase();
    }

    return { ...auth, attributes };
  };
}

function parseExecutionModeHeader(value: string): AgentRunPolicy["executionMode"] {
  if (value === "automation" || value === "cautious" || value === "standard") return value;
  throw new Error("The Agent execution mode is invalid.");
}

function parseRunPolicyHeader(value: string | null): AgentRunPolicy {
  if (!value) return {};
  if (value.length > 16_384 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("The AgentRun policy header is invalid.");
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parseAgentRunPolicy(parsed);
  } catch {
    throw new Error("The AgentRun policy header is invalid.");
  }
}

export default eveChannel({
  auth: [
    // Host-signed tenant identity is the primary production browser path.
    sessionOwnershipStore
      ? withSessionOwnership(
          withAgentPreferences(hostJwtAuthFromEnvironment()),
          sessionOwnershipStore,
        )
      : withAgentPreferences(hostJwtAuthFromEnvironment()),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    withAgentPreferences(vercelOidc()),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    withAgentPreferences(localDev()),
  ],
});
