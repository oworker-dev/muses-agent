import type { AgentLocale, AgentMessages } from "./i18n.js";
export declare function AgentSettingsDialog({ locale, messages, onLocaleChange, onOpenChange, open, }: {
    readonly locale: AgentLocale;
    readonly messages: AgentMessages;
    readonly onLocaleChange: (locale: AgentLocale) => void;
    readonly onOpenChange: (open: boolean) => void;
    readonly open: boolean;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-settings-dialog.d.ts.map