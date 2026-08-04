import type { AgentHostInvocationIdentity } from "@oworker/open-agent-contracts/host";
export declare const AGENT_HOST_SIGNATURE_VERSION: "0.2.0";
export declare const AGENT_HOST_HEADER: {
    readonly actorType: "x-agent-host-actor-type";
    readonly principal: "x-agent-host-principal";
    readonly scope: "x-agent-host-scope";
    readonly signature: "x-agent-host-signature";
    readonly tenant: "x-agent-host-tenant";
    readonly timestamp: "x-agent-host-timestamp";
};
export type AgentHostSignatureInput = {
    readonly body?: string;
    readonly identity: AgentHostInvocationIdentity;
    readonly method: string;
    readonly secret: string;
    readonly timestamp?: number;
    readonly url: string | URL;
};
export type AgentHostSignatureVerificationInput = {
    readonly body?: string;
    readonly headers: Headers | HeadersInit;
    readonly maxClockSkewMs?: number;
    readonly method: string;
    readonly now?: number;
    readonly secret: string;
    readonly url: string | URL;
};
export declare function signAgentHostCapabilityRequest(input: AgentHostSignatureInput): Readonly<Record<string, string>>;
export declare function verifyAgentHostCapabilityRequest(input: AgentHostSignatureVerificationInput): AgentHostInvocationIdentity;
export declare class AgentHostCapabilityAuthError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
//# sourceMappingURL=capability-signature.d.ts.map