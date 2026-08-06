import type { AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
import { type AgentLocale } from "./i18n.js";
export declare function AgentChildSessionView({ client, locale, preferences, sessionId, }: {
    readonly client?: AgentWorkspaceClientConfig;
    readonly locale: AgentLocale;
    readonly preferences: AgentThreadPreferences;
    readonly sessionId: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-child-session.d.ts.map