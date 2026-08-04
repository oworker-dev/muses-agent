import type { AgentHostCapabilityDescriptor } from "@oworker/open-agent-contracts/host-capability";
import type { JsonValue } from "@oworker/open-agent-contracts/agent-run";
export type AgentHostCapabilityRegistration<TContext> = {
    readonly descriptor: AgentHostCapabilityDescriptor;
    readonly invoke: (input: Readonly<Record<string, JsonValue>>, context: TContext) => JsonValue | Promise<JsonValue>;
    readonly validate?: (input: unknown) => input is Readonly<Record<string, JsonValue>>;
};
export interface AgentHostCapabilityRegistry<TContext> {
    list(): readonly AgentHostCapabilityDescriptor[];
    invoke(name: string, input: unknown, context: TContext): Promise<JsonValue>;
}
export declare function createAgentHostCapabilityRegistry<TContext>(registrations: readonly AgentHostCapabilityRegistration<TContext>[]): AgentHostCapabilityRegistry<TContext>;
export declare class AgentHostCapabilityNotFoundError extends Error {
    readonly capability: string;
    constructor(capability: string);
}
export declare class AgentHostCapabilityInputError extends Error {
    readonly capability: string;
    constructor(capability: string);
}
//# sourceMappingURL=capability-registry.d.ts.map