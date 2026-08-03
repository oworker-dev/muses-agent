import { Accordion, AccordionItem } from "../ui/accordion.js";
import type { Tool } from "ai";
import type { ComponentProps } from "react";
export type AgentProps = ComponentProps<"div">;
export declare const Agent: import("react").MemoExoticComponent<({ className, ...props }: AgentProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentHeaderProps = ComponentProps<"div"> & {
    name: string;
    model?: string;
};
export declare const AgentHeader: import("react").MemoExoticComponent<({ className, name, model, ...props }: AgentHeaderProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentContentProps = ComponentProps<"div">;
export declare const AgentContent: import("react").MemoExoticComponent<({ className, ...props }: AgentContentProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentInstructionsProps = ComponentProps<"div"> & {
    children: string;
};
export declare const AgentInstructions: import("react").MemoExoticComponent<({ className, children, ...props }: AgentInstructionsProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentToolsProps = ComponentProps<typeof Accordion>;
export declare const AgentTools: import("react").MemoExoticComponent<({ className, ...props }: AgentToolsProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentToolProps = ComponentProps<typeof AccordionItem> & {
    tool: Tool;
};
export declare const AgentTool: import("react").MemoExoticComponent<({ className, tool, value, ...props }: AgentToolProps) => import("react/jsx-runtime").JSX.Element>;
export type AgentOutputProps = ComponentProps<"div"> & {
    schema: string;
};
export declare const AgentOutput: import("react").MemoExoticComponent<({ className, schema, ...props }: AgentOutputProps) => import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=agent.d.ts.map