import { defineState } from "eve/context";
import type { AgentRuntimeConfigSnapshot } from "@oworker/open-agent-contracts/runtime-config";
import {
  resolveAgentRuntimeConfig,
  serializeAgentRuntimeConfig,
} from "../../lib/agent-runtime-config.ts";

export const runtimeConfigState = defineState<AgentRuntimeConfigSnapshot | null>(
  "open-agent.runtime-config.v1",
  () => null,
);

export type AgentRuntimeConfigContext = {
  readonly session: {
    readonly auth: {
      readonly current?: AgentAuthPrincipal | null;
      readonly initiator?: AgentAuthPrincipal | null;
    };
  };
};

type AgentAuthPrincipal = {
  readonly attributes?: Readonly<Record<string, unknown>>;
};

export function initializeAgentRuntimeConfig(ctx: AgentRuntimeConfigContext): AgentRuntimeConfigSnapshot {
  const config = resolveAgentRuntimeConfig(
    ctx.session.auth.initiator?.attributes ?? ctx.session.auth.current?.attributes,
  );
  runtimeConfigState.update(() => config);
  return config;
}

export function readAgentRuntimeConfig(ctx: AgentRuntimeConfigContext): AgentRuntimeConfigSnapshot {
  return runtimeConfigState.get() ??
    resolveAgentRuntimeConfig(
      ctx.session.auth.initiator?.attributes ?? ctx.session.auth.current?.attributes,
    );
}

export function runtimeConfigFingerprint(config: AgentRuntimeConfigSnapshot): string {
  return serializeAgentRuntimeConfig(config);
}
