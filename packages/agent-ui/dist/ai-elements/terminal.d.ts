import { Button } from "../ui/button.js";
import type { ComponentProps, HTMLAttributes } from "react";
export type TerminalHeaderProps = HTMLAttributes<HTMLDivElement>;
export declare const TerminalHeader: ({ className, children, ...props }: TerminalHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type TerminalTitleProps = HTMLAttributes<HTMLDivElement>;
export declare const TerminalTitle: ({ className, children, ...props }: TerminalTitleProps) => import("react/jsx-runtime").JSX.Element;
export type TerminalStatusProps = HTMLAttributes<HTMLDivElement>;
export declare const TerminalStatus: ({ className, children, ...props }: TerminalStatusProps) => import("react/jsx-runtime").JSX.Element | null;
export type TerminalActionsProps = HTMLAttributes<HTMLDivElement>;
export declare const TerminalActions: ({ className, children, ...props }: TerminalActionsProps) => import("react/jsx-runtime").JSX.Element;
export type TerminalCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};
export declare const TerminalCopyButton: ({ onCopy, onError, timeout, children, className, ...props }: TerminalCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
export type TerminalClearButtonProps = ComponentProps<typeof Button>;
export declare const TerminalClearButton: ({ children, className, ...props }: TerminalClearButtonProps) => import("react/jsx-runtime").JSX.Element | null;
export type TerminalContentProps = HTMLAttributes<HTMLDivElement>;
export declare const TerminalContent: ({ className, children, ...props }: TerminalContentProps) => import("react/jsx-runtime").JSX.Element;
export type TerminalProps = HTMLAttributes<HTMLDivElement> & {
    output: string;
    isStreaming?: boolean;
    autoScroll?: boolean;
    onClear?: () => void;
};
export declare const Terminal: ({ output, isStreaming, autoScroll, onClear, className, children, ...props }: TerminalProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=terminal.d.ts.map