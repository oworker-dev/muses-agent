import type { EveMessage } from "eve/react";
import type { AgentLocale } from "./i18n.js";
export type AgentInputResponse = {
    readonly optionId?: string;
    readonly requestId: string;
    readonly text?: string;
};
export declare function AgentMessage({ canRespond, isStreaming, locale, message, onInputResponses, }: {
    readonly canRespond: boolean;
    readonly isStreaming: boolean;
    readonly locale: AgentLocale;
    readonly message: EveMessage;
    readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-message.d.ts.map