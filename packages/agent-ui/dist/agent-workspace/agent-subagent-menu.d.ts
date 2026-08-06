import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentLocale } from "./i18n.js";
export declare function AgentSubagentMenu({ activeSessionId, events, locale, onOpen, }: {
    readonly activeSessionId?: string;
    readonly events: readonly HandleMessageStreamEvent[];
    readonly locale: AgentLocale;
    readonly onOpen: (sessionId: string) => void;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=agent-subagent-menu.d.ts.map