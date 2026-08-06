import type { HandleMessageStreamEvent, InputRequest } from "eve/client";
import type { EveDynamicToolPart, EveMessage, EveMessagePart } from "eve/react";
export type AgentTurnStatus = "cancelled" | "completed" | "failed" | "running" | "waiting";
export type SubagentCallPresentation = {
    readonly childSessionId?: string;
    readonly endedAt?: number;
    readonly name?: string;
    readonly startedAt?: number;
    readonly status: "cancelled" | "completed" | "failed" | "running" | "starting";
};
export type SubagentSessionPresentation = SubagentCallPresentation & {
    readonly callId: string;
    readonly task?: string;
};
export type AgentTurnPresentation = {
    readonly endedAt?: number;
    readonly finalPart?: Extract<EveMessagePart, {
        type: "text";
    }>;
    readonly proxiedInputParts: readonly EveDynamicToolPart[];
    readonly processParts: readonly EveMessagePart[];
    readonly startedAt?: number;
    readonly status: AgentTurnStatus;
};
export declare function presentAgentTurn(message: EveMessage, events: readonly HandleMessageStreamEvent[]): AgentTurnPresentation | undefined;
export declare function isProxiedInputOnlyMessage(message: EveMessage, events: readonly HandleMessageStreamEvent[]): boolean;
export declare function unresolvedInputRequests(events: readonly HandleMessageStreamEvent[]): readonly InputRequest[];
export declare function hasUnresolvedInputRequests(events: readonly HandleMessageStreamEvent[]): boolean;
export declare function presentSubagentCall(events: readonly HandleMessageStreamEvent[], callId: string): SubagentCallPresentation;
export declare function presentSubagentSessions(events: readonly HandleMessageStreamEvent[]): readonly SubagentSessionPresentation[];
//# sourceMappingURL=turn-presentation.d.ts.map