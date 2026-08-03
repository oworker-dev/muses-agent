import { Button } from "../ui/button.js";
import { CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import type { ComponentProps } from "react";
export type StackTraceProps = ComponentProps<"div"> & {
    trace: string;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onFilePathClick?: (filePath: string, line?: number, column?: number) => void;
};
export declare const StackTrace: import("react").MemoExoticComponent<({ trace, className, open, defaultOpen, onOpenChange, onFilePathClick, children, ...props }: StackTraceProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceHeaderProps = ComponentProps<typeof CollapsibleTrigger>;
export declare const StackTraceHeader: import("react").MemoExoticComponent<({ className, children, ...props }: StackTraceHeaderProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceErrorProps = ComponentProps<"div">;
export declare const StackTraceError: import("react").MemoExoticComponent<({ className, children, ...props }: StackTraceErrorProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceErrorTypeProps = ComponentProps<"span">;
export declare const StackTraceErrorType: import("react").MemoExoticComponent<({ className, children, ...props }: StackTraceErrorTypeProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceErrorMessageProps = ComponentProps<"span">;
export declare const StackTraceErrorMessage: import("react").MemoExoticComponent<({ className, children, ...props }: StackTraceErrorMessageProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceActionsProps = ComponentProps<"div">;
export declare const StackTraceActions: import("react").MemoExoticComponent<({ className, children, ...props }: StackTraceActionsProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};
export declare const StackTraceCopyButton: import("react").MemoExoticComponent<({ onCopy, onError, timeout, className, children, ...props }: StackTraceCopyButtonProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceExpandButtonProps = ComponentProps<"div">;
export declare const StackTraceExpandButton: import("react").MemoExoticComponent<({ className, ...props }: StackTraceExpandButtonProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceContentProps = ComponentProps<typeof CollapsibleContent> & {
    maxHeight?: number;
};
export declare const StackTraceContent: import("react").MemoExoticComponent<({ className, maxHeight, children, ...props }: StackTraceContentProps) => import("react/jsx-runtime").JSX.Element>;
export type StackTraceFramesProps = ComponentProps<"div"> & {
    showInternalFrames?: boolean;
};
export declare const StackTraceFrames: import("react").MemoExoticComponent<({ className, showInternalFrames, ...props }: StackTraceFramesProps) => import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=stack-trace.d.ts.map