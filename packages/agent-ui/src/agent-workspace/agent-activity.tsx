"use client";

import type { MessageStreamEvent } from "eve/client";
import { useRef } from "react";
import {
  ReasoningRoot,
  ReasoningTrigger,
} from "../assistant-ui/reasoning.js";
import { activityLabel } from "./agent-activity-state.js";
import type { AgentMessages } from "./i18n.js";

export function AgentActivity({
  events,
  messages,
  mode = "live",
  quietUntilSlow = false,
}: {
  readonly events: readonly MessageStreamEvent[];
  readonly messages: AgentMessages;
  readonly mode?: "live" | "recovery";
  readonly quietUntilSlow?: boolean;
}) {
  const mountedAt = useRef(Date.now());
  const label = activityLabel(events, messages, { mode, mountedAt: mountedAt.current, now: Date.now() });
  if (quietUntilSlow) return null;
  return (
    <ReasoningRoot className="mb-1" role="status" streaming variant="ghost">
      <ReasoningTrigger active label={label} />
    </ReasoningRoot>
  );
}
