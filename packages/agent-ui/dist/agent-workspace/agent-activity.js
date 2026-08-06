"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner.js";
import { activityLabel } from "./agent-activity-state.js";
export function AgentActivity({ events, messages, mode = "live", quietUntilSlow = false, }) {
    const mountedAt = useRef(Date.now());
    const startedAt = activeTaskStartedAt(events);
    const now = useNow(startedAt);
    const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1_000)) : 0;
    const label = activityLabel(events, messages, { mode, mountedAt: mountedAt.current, now });
    if (quietUntilSlow && label !== messages.providerTakingLonger && label !== messages.providerStillWaiting) {
        return null;
    }
    return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", role: "status", children: [_jsx(Spinner, { className: "size-4 shrink-0" }), _jsx("span", { children: label }), startedAt ? (_jsx("span", { "aria-label": `${messages.elapsed} ${formatElapsed(elapsed)}`, className: "text-xs tabular-nums", children: formatElapsed(elapsed) })) : null] }));
}
function useNow(dependency) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [dependency]);
    return now;
}
function activeTaskStartedAt(events) {
    const latestTurn = [...events].reverse().find((candidate) => candidate.type === "turn.started");
    const turnId = latestTurn?.type === "turn.started" ? latestTurn.data.turnId : undefined;
    const event = events.find((candidate) => candidate.type === "actions.requested" && (!turnId || candidate.data.turnId === turnId));
    const timestamp = event?.meta?.at;
    if (!timestamp)
        return undefined;
    const parsed = Date.parse(timestamp);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function formatElapsed(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
        ? [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
        : [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
//# sourceMappingURL=agent-activity.js.map