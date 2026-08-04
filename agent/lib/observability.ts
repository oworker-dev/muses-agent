import { TraceFlags, type SpanContext } from "@opentelemetry/api";

type ObservableSession = {
  readonly id: string;
  readonly auth: {
    readonly current: {
      readonly attributes: Readonly<Record<string, unknown>>;
    } | null;
  };
};

const TRACE_PARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export function parseRemoteTraceParent(value: unknown): SpanContext | undefined {
  if (typeof value !== "string") return undefined;
  const match = TRACE_PARENT_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const [, traceId, spanId, flags] = match;
  if (!traceId || !spanId || !flags) return undefined;
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return undefined;

  return {
    isRemote: true,
    spanId: spanId.toLowerCase(),
    traceFlags: (Number.parseInt(flags, 16) & TraceFlags.SAMPLED) as TraceFlags,
    traceId: traceId.toLowerCase(),
  };
}

export function agentCorrelationAttributes(session: ObservableSession): Record<string, string> {
  return {
    "open_agent.correlation_id": stringAttribute(session, "agentCorrelationId"),
    "open_agent.profile_id": stringAttribute(session, "agentProfileId"),
    "open_agent.profile_version": stringAttribute(session, "agentProfileVersion"),
    "open_agent.run_id": stringAttribute(session, "agentRunId"),
    "open_agent.session_id": session.id,
    "open_agent.tenant_id": stringAttribute(session, "tenantId"),
  };
}

export function upstreamTraceContext(session: ObservableSession): SpanContext | undefined {
  return parseRemoteTraceParent(
    session.auth.current?.attributes.agentUpstreamTraceParent,
  );
}

function stringAttribute(session: ObservableSession, name: string): string {
  const value = session.auth.current?.attributes[name];
  return typeof value === "string" ? value : "";
}
