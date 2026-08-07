"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from "react";
import { activityLabel } from "./agent-activity-state.js";
export function AgentActivity({ events, messages, mode = "live", quietUntilSlow = false, }) {
    const mountedAt = useRef(Date.now());
    const label = activityLabel(events, messages, { mode, mountedAt: mountedAt.current, now: Date.now() });
    if (quietUntilSlow)
        return null;
    return (_jsx("div", { className: "text-sm text-muted-foreground", role: "status", children: _jsx("span", { className: "shimmer motion-reduce:animate-none", children: label }) }));
}
//# sourceMappingURL=agent-activity.js.map