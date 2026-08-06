import { Collapsible, CollapsibleContent } from "../ui/collapsible.js";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps } from "react";
export type ToolProps = ComponentProps<typeof Collapsible>;
export declare const Tool: ({ className, ...props }: ToolProps) => import("react/jsx-runtime").JSX.Element;
export type ToolPart = ToolUIPart | DynamicToolUIPart;
export type ToolHeaderProps = {
    title?: string;
    className?: string;
    showStatus?: boolean;
    statusLabel?: string;
} & ({
    type: ToolUIPart["type"];
    state: ToolUIPart["state"];
    toolName?: never;
} | {
    type: DynamicToolUIPart["type"];
    state: DynamicToolUIPart["state"];
    toolName: string;
});
export declare const getStatusBadge: (status: ToolPart["state"], label?: string) => import("react/jsx-runtime").JSX.Element;
export declare const ToolHeader: ({ className, title, type, state, showStatus, statusLabel, toolName, ...props }: ToolHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;
export declare const ToolContent: ({ className, ...props }: ToolContentProps) => import("react/jsx-runtime").JSX.Element;
export type ToolInputProps = ComponentProps<"div"> & {
    input: ToolPart["input"];
    label?: string;
};
export declare const ToolInput: ({ className, input, label, ...props }: ToolInputProps) => import("react/jsx-runtime").JSX.Element;
export type ToolOutputProps = ComponentProps<"div"> & {
    output: ToolPart["output"];
    errorText: ToolPart["errorText"];
    errorLabel?: string;
    resultLabel?: string;
};
export declare const ToolOutput: ({ className, output, errorLabel, errorText, resultLabel, ...props }: ToolOutputProps) => import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=tool.d.ts.map