import type { AgentHostInvocationIdentity } from "@muses/agent-contracts/host";
import { type AgentHostCapabilityDescriptor, type AgentHostCapabilityInvokeRequest, type AgentHostCapabilityInvokeResponse } from "@muses/agent-contracts/host-capability";
import type { JsonValue } from "@muses/agent-contracts/agent-run";
export type AgentHostCapabilityClientOptions = {
    readonly baseUrl: string;
    readonly fetch?: typeof globalThis.fetch;
    readonly identity: AgentHostInvocationIdentity | (() => AgentHostInvocationIdentity | Promise<AgentHostInvocationIdentity>);
    readonly now?: () => number;
    readonly secret: string | (() => string | Promise<string>);
    readonly timeoutMs?: number;
};
export interface AgentHostCapabilityClient {
    list(options?: {
        readonly signal?: AbortSignal;
    }): Promise<readonly AgentHostCapabilityDescriptor[]>;
    invoke(input: AgentHostCapabilityInvokeRequest, options?: {
        readonly signal?: AbortSignal;
    }): Promise<AgentHostCapabilityInvokeResponse>;
}
export declare function createAgentHostCapabilityClient(options: AgentHostCapabilityClientOptions): AgentHostCapabilityClient;
export declare class AgentHostCapabilityHttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, message: string, body: unknown);
}
export declare class AgentHostCapabilityContractError extends Error {
    readonly body: unknown;
    constructor(body: unknown);
}
export type AgentHostCapabilityInvocation = {
    readonly capability: string;
    readonly correlationId?: string;
    readonly input: Readonly<Record<string, JsonValue>>;
    readonly runId: string;
    readonly sessionId: string;
};
//# sourceMappingURL=capability-client.d.ts.map