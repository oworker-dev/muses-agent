import { type SessionState } from "eve/client";
import type { AgentThreadPreferences, AgentWorkspaceClientConfig } from "./contracts.js";
export declare function createAgentSession(config: AgentWorkspaceClientConfig | undefined, preferences: AgentThreadPreferences | (() => AgentThreadPreferences), state?: SessionState): import("eve/client").ClientSession;
//# sourceMappingURL=agent-client.d.ts.map