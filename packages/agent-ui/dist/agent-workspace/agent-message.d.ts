import type { EveMessage } from "eve/react";
import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentLocale } from "./i18n.js";
export type AgentInputResponse = {
    readonly optionId?: string;
    readonly requestId: string;
    readonly text?: string;
};
export declare function AgentMessage({ canRespond, events, fallbackStartedAt, isStreaming, locale, message, onOpenSubagent, onInputResponses, }: {
    readonly canRespond: boolean;
    readonly events: readonly HandleMessageStreamEvent[];
    readonly fallbackStartedAt?: number;
    readonly isStreaming: boolean;
    readonly locale: AgentLocale;
    readonly message: EveMessage;
    readonly onOpenSubagent?: (sessionId: string) => void;
    readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-message.d.ts.map