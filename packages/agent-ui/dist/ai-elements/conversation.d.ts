import { Button } from "../ui/button.js";
import type { UIMessage } from "ai";
import type { ComponentProps } from "react";
import { StickToBottom } from "use-stick-to-bottom";
export type ConversationProps = ComponentProps<typeof StickToBottom>;
export declare const Conversation: ({ className, ...props }: ConversationProps) => import("react/jsx-runtime").JSX.Element;
export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;
export declare const ConversationContent: ({ className, ...props }: ConversationContentProps) => import("react/jsx-runtime").JSX.Element;
export type ConversationEmptyStateProps = ComponentProps<"div"> & {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
};
export declare const ConversationEmptyState: ({ className, title, description, icon, children, ...props }: ConversationEmptyStateProps) => import("react/jsx-runtime").JSX.Element;
export type ConversationScrollButtonProps = ComponentProps<typeof Button>;
export declare const ConversationScrollButton: ({ className, ...props }: ConversationScrollButtonProps) => false | import("react/jsx-runtime").JSX.Element;
export type ConversationDownloadProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
    messages: UIMessage[];
    filename?: string;
    formatMessage?: (message: UIMessage, index: number) => string;
};
export declare const messagesToMarkdown: (messages: UIMessage[], formatMessage?: (message: UIMessage, index: number) => string) => string;
export declare const ConversationDownload: ({ messages, filename, formatMessage, className, children, ...props }: ConversationDownloadProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=conversation.d.ts.map