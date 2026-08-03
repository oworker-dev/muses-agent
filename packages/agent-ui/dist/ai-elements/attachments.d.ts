import { Button } from "../ui/button.js";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card.js";
import type { FileUIPart, SourceDocumentUIPart } from "ai";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
export type AttachmentData = (FileUIPart & {
    id: string;
}) | (SourceDocumentUIPart & {
    id: string;
});
export type AttachmentMediaCategory = "image" | "video" | "audio" | "document" | "source" | "unknown";
export type AttachmentVariant = "grid" | "inline" | "list";
export declare const getMediaCategory: (data: AttachmentData) => AttachmentMediaCategory;
export declare const getAttachmentLabel: (data: AttachmentData) => string;
interface AttachmentsContextValue {
    variant: AttachmentVariant;
}
interface AttachmentContextValue {
    data: AttachmentData;
    mediaCategory: AttachmentMediaCategory;
    onRemove?: () => void;
    variant: AttachmentVariant;
}
export declare const useAttachmentsContext: () => AttachmentsContextValue;
export declare const useAttachmentContext: () => AttachmentContextValue;
export type AttachmentsProps = HTMLAttributes<HTMLDivElement> & {
    variant?: AttachmentVariant;
};
export declare const Attachments: ({ variant, className, children, ...props }: AttachmentsProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
    data: AttachmentData;
    onRemove?: () => void;
};
export declare const Attachment: ({ data, onRemove, className, children, ...props }: AttachmentProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
    fallbackIcon?: ReactNode;
};
export declare const AttachmentPreview: ({ fallbackIcon, className, ...props }: AttachmentPreviewProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
    showMediaType?: boolean;
};
export declare const AttachmentInfo: ({ showMediaType, className, ...props }: AttachmentInfoProps) => import("react/jsx-runtime").JSX.Element | null;
export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
    label?: string;
};
export declare const AttachmentRemove: ({ label, className, children, ...props }: AttachmentRemoveProps) => import("react/jsx-runtime").JSX.Element | null;
export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;
export declare const AttachmentHoverCard: ({ openDelay, closeDelay, ...props }: AttachmentHoverCardProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;
export declare const AttachmentHoverCardTrigger: (props: AttachmentHoverCardTriggerProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentHoverCardContentProps = ComponentProps<typeof HoverCardContent>;
export declare const AttachmentHoverCardContent: ({ align, className, ...props }: AttachmentHoverCardContentProps) => import("react/jsx-runtime").JSX.Element;
export type AttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;
export declare const AttachmentEmpty: ({ className, children, ...props }: AttachmentEmptyProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=attachments.d.ts.map