import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentMessages } from "./i18n.js";
export declare function AgentActivity({ events, messages, mode, quietUntilSlow, }: {
    readonly events: readonly HandleMessageStreamEvent[];
    readonly messages: AgentMessages;
    readonly mode?: "live" | "recovery";
    readonly quietUntilSlow?: boolean;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=agent-activity.d.ts.map