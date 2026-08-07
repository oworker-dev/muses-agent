import type { JsonValue } from "./agent-run.js";
export declare const AGENT_SESSION_CONTRACT_VERSION: "0.1.0-draft";
/** Serializable position used to resume one durable interactive conversation. */
export type AgentSessionCursor = {
    readonly sessionId?: string;
    readonly eventCursor: number;
};
export type AgentSessionTextPart = {
    readonly type: "text";
    readonly text: string;
};
export type AgentSessionFilePart = {
    readonly type: "file";
    readonly data: string;
    readonly mediaType: string;
    readonly filename?: string;
};
export type AgentSessionUserContent = readonly (AgentSessionTextPart | AgentSessionFilePart)[];
export type AgentSessionInputResponse = {
    readonly requestId: string;
    readonly optionId?: string;
    readonly text?: string;
};
export type AgentSessionInputOption = {
    readonly id: string;
    readonly label: string;
    readonly description?: string;
    readonly style?: "danger" | "default" | "primary";
};
export type AgentSessionInputRequest = {
    readonly requestId: string;
    readonly prompt: string;
    readonly allowFreeform?: boolean;
    readonly display?: "confirmation" | "select" | "text";
    readonly options?: readonly AgentSessionInputOption[];
    readonly action: {
        readonly callId: string;
        readonly input: Readonly<Record<string, JsonValue>>;
        readonly kind: "tool-call";
        readonly toolName: string;
    };
};
export type AgentSessionSendPayload = {
    readonly clientContext?: string | readonly string[] | Readonly<Record<string, JsonValue>>;
    readonly inputResponses?: readonly AgentSessionInputResponse[];
    readonly message?: string | AgentSessionUserContent;
    readonly outputSchema?: Readonly<Record<string, JsonValue>>;
};
export type AgentSessionEvent = {
    readonly contractVersion: typeof AGENT_SESSION_CONTRACT_VERSION;
    /** Number of durable events consumed after this event. */
    readonly cursor: number;
    readonly data?: JsonValue;
    readonly meta?: JsonValue;
    readonly type: string;
};
export type AgentSessionTurnResult<TOutput = unknown> = {
    readonly data: TOutput | undefined;
    readonly events: readonly AgentSessionEvent[];
    readonly inputRequests: readonly AgentSessionInputRequest[];
    readonly message: string | undefined;
    readonly sessionId: string;
    readonly status: "completed" | "failed" | "waiting";
};
export type AgentSessionCancellation = {
    readonly sessionId: string;
    readonly status: "accepted";
} | {
    readonly status: "no_active_turn";
};
export type AgentSessionReset = {
    readonly previousSessionId: string;
    readonly status: "reset";
} | {
    readonly status: "no_active_session";
};
//# sourceMappingURL=agent-session.d.ts.map