import type { AgentRunPolicy, JsonValue } from "./agent-run.js";
export declare const AGENT_EMBED_CONTRACT_VERSION: "0.1.0";
export type AgentEmbedTheme = "dark" | "light" | "system";
export type AgentEmbedConfigureMessage = {
    readonly type: "agent.embed.configure";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
    readonly requestId: string;
    readonly accessToken: string;
    readonly expiresAt: string;
    readonly serviceUrl: string;
    readonly storageKey: string;
    readonly profile: {
        readonly id: string;
        readonly version: string;
    };
    readonly runPolicy?: AgentRunPolicy;
    readonly clientContext?: string | readonly string[] | Readonly<Record<string, JsonValue>>;
    readonly locale?: "en" | "zh-CN";
    readonly theme?: AgentEmbedTheme;
};
export type AgentEmbedHostMessage = AgentEmbedConfigureMessage;
export type AgentEmbedReadyMessage = {
    readonly type: "agent.embed.ready";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
};
export type AgentEmbedConfiguredMessage = {
    readonly type: "agent.embed.configured";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
    readonly requestId: string;
};
export type AgentEmbedErrorMessage = {
    readonly type: "agent.embed.error";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
    readonly requestId?: string;
    readonly code: string;
    readonly message: string;
};
export type AgentEmbedTurnMessage = {
    readonly type: "agent.embed.turn-started" | "agent.embed.turn-completed" | "agent.embed.turn-failed" | "agent.embed.turn-cancelled";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
    readonly turnId: string;
    readonly message?: string;
};
export type AgentEmbedHostCapabilityMessage = {
    readonly type: "agent.embed.host-capability-completed";
    readonly contractVersion: typeof AGENT_EMBED_CONTRACT_VERSION;
    readonly capability: string;
    readonly output: JsonValue;
};
export type AgentEmbedEvent = AgentEmbedReadyMessage | AgentEmbedConfiguredMessage | AgentEmbedErrorMessage | AgentEmbedTurnMessage | AgentEmbedHostCapabilityMessage;
export declare function parseAgentEmbedEvent(value: unknown): AgentEmbedEvent | undefined;
export declare function parseAgentEmbedHostMessage(value: unknown): AgentEmbedHostMessage | undefined;
export declare function isAllowedAgentEmbedParentOrigin(referrer: string, allowedOrigins: readonly string[]): string | undefined;
//# sourceMappingURL=agent-embed.d.ts.map