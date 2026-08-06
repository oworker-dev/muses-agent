import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentMessages } from "./i18n.js";
export declare function activityLabel(events: readonly HandleMessageStreamEvent[], messages: AgentMessages, options: {
    readonly mode?: "live" | "recovery";
    readonly mountedAt: number;
    readonly now: number;
}): string;
//# sourceMappingURL=agent-activity-state.d.ts.map