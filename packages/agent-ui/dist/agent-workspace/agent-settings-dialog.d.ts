import type { AgentLocale, AgentMessages } from "./i18n.js";
import type { AgentExtensionInfo } from "./contracts.js";
export declare function AgentSettingsDialog({ extensions, locale, messages, onLocaleChange, onOpenChange, open, }: {
    readonly extensions: readonly AgentExtensionInfo[];
    readonly locale: AgentLocale;
    readonly messages: AgentMessages;
    readonly onLocaleChange: (locale: AgentLocale) => void;
    readonly onOpenChange: (open: boolean) => void;
    readonly open: boolean;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agent-settings-dialog.d.ts.map