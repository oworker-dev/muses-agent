import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import type { ComponentProps, ReactNode } from "react";
interface ReasoningContextValue {
    isStreaming: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    duration: number | undefined;
}
export declare const useReasoning: () => ReasoningContextValue;
export type ReasoningProps = ComponentProps<typeof Collapsible> & {
    isStreaming?: boolean;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    duration?: number;
};
export declare const Reasoning: import("react").MemoExoticComponent<({ className, isStreaming, open, defaultOpen, onOpenChange, duration: durationProp, children, ...props }: ReasoningProps) => import("react/jsx-runtime").JSX.Element>;
export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
    getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};
export declare const ReasoningTrigger: import("react").MemoExoticComponent<({ className, children, getThinkingMessage, ...props }: ReasoningTriggerProps) => import("react/jsx-runtime").JSX.Element>;
export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
    children: string;
};
export declare const ReasoningContent: import("react").MemoExoticComponent<({ className, children, ...props }: ReasoningContentProps) => import("react/jsx-runtime").JSX.Element>;
export {};
//# sourceMappingURL=reasoning.d.ts.map