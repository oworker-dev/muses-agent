"use client";

import type { HandleMessageStreamEvent } from "eve/client";
import { useRef } from "react";
import { activityLabel } from "./agent-activity-state.js";
import type { AgentMessages } from "./i18n.js";

export function AgentActivity({
  events,
  messages,
  mode = "live",
  quietUntilSlow = false,
}: {
  readonly events: readonly HandleMessageStreamEvent[];
  readonly messages: AgentMessages;
  readonly mode?: "live" | "recovery";
  readonly quietUntilSlow?: boolean;
}) {
  const mountedAt = useRef(Date.now());
  const label = activityLabel(events, messages, { mode, mountedAt: mountedAt.current, now: Date.now() });
  if (quietUntilSlow) return null;
  return (
    <div className="text-sm text-muted-foreground" role="status">
      <span className="shimmer motion-reduce:animate-none">{label}</span>
    </div>
  );
}
