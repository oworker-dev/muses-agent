import { Avatar } from "../ui/avatar.js";
import { Button } from "../ui/button.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { FileIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
export type CommitProps = ComponentProps<typeof Collapsible>;
export declare const Commit: ({ className, children, ...props }: CommitProps) => import("react/jsx-runtime").JSX.Element;
export type CommitHeaderProps = ComponentProps<typeof CollapsibleTrigger>;
export declare const CommitHeader: ({ className, children, ...props }: CommitHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type CommitHashProps = HTMLAttributes<HTMLSpanElement>;
export declare const CommitHash: ({ className, children, ...props }: CommitHashProps) => import("react/jsx-runtime").JSX.Element;
export type CommitMessageProps = HTMLAttributes<HTMLSpanElement>;
export declare const CommitMessage: ({ className, children, ...props }: CommitMessageProps) => import("react/jsx-runtime").JSX.Element;
export type CommitMetadataProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitMetadata: ({ className, children, ...props }: CommitMetadataProps) => import("react/jsx-runtime").JSX.Element;
export type CommitSeparatorProps = HTMLAttributes<HTMLSpanElement>;
export declare const CommitSeparator: ({ className, children, ...props }: CommitSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export type CommitInfoProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitInfo: ({ className, children, ...props }: CommitInfoProps) => import("react/jsx-runtime").JSX.Element;
export type CommitAuthorProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitAuthor: ({ className, children, ...props }: CommitAuthorProps) => import("react/jsx-runtime").JSX.Element;
export type CommitAuthorAvatarProps = ComponentProps<typeof Avatar> & {
    initials: string;
};
export declare const CommitAuthorAvatar: ({ initials, className, ...props }: CommitAuthorAvatarProps) => import("react/jsx-runtime").JSX.Element;
export type CommitTimestampProps = HTMLAttributes<HTMLTimeElement> & {
    date: Date;
};
export declare const CommitTimestamp: ({ date, className, children, ...props }: CommitTimestampProps) => import("react/jsx-runtime").JSX.Element;
export type CommitActionsProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitActions: ({ className, children, ...props }: CommitActionsProps) => import("react/jsx-runtime").JSX.Element;
export type CommitCopyButtonProps = ComponentProps<typeof Button> & {
    hash: string;
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};
export declare const CommitCopyButton: ({ hash, onCopy, onError, timeout, children, className, ...props }: CommitCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
export type CommitContentProps = ComponentProps<typeof CollapsibleContent>;
export declare const CommitContent: ({ className, children, ...props }: CommitContentProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFilesProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitFiles: ({ className, children, ...props }: CommitFilesProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitFile: ({ className, children, ...props }: CommitFileProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileInfoProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitFileInfo: ({ className, children, ...props }: CommitFileInfoProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileStatusProps = HTMLAttributes<HTMLSpanElement> & {
    status: "added" | "modified" | "deleted" | "renamed";
};
export declare const CommitFileStatus: ({ status, className, children, ...props }: CommitFileStatusProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileIconProps = ComponentProps<typeof FileIcon>;
export declare const CommitFileIcon: ({ className, ...props }: CommitFileIconProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFilePathProps = HTMLAttributes<HTMLSpanElement>;
export declare const CommitFilePath: ({ className, children, ...props }: CommitFilePathProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileChangesProps = HTMLAttributes<HTMLDivElement>;
export declare const CommitFileChanges: ({ className, children, ...props }: CommitFileChangesProps) => import("react/jsx-runtime").JSX.Element;
export type CommitFileAdditionsProps = HTMLAttributes<HTMLSpanElement> & {
    count: number;
};
export declare const CommitFileAdditions: ({ count, className, children, ...props }: CommitFileAdditionsProps) => import("react/jsx-runtime").JSX.Element | null;
export type CommitFileDeletionsProps = HTMLAttributes<HTMLSpanElement> & {
    count: number;
};
export declare const CommitFileDeletions: ({ count, className, children, ...props }: CommitFileDeletionsProps) => import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=commit.d.ts.map