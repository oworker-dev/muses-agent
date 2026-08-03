import { Collapsible, CollapsibleContent } from "../ui/collapsible.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.js";
import type { ToolUIPart } from "ai";
import type { ComponentProps } from "react";
export type SandboxRootProps = ComponentProps<typeof Collapsible>;
export declare const Sandbox: ({ className, ...props }: SandboxRootProps) => import("react/jsx-runtime").JSX.Element;
export interface SandboxHeaderProps {
    title?: string;
    state: ToolUIPart["state"];
    className?: string;
}
export declare const SandboxHeader: ({ className, title, state, ...props }: SandboxHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxContentProps = ComponentProps<typeof CollapsibleContent>;
export declare const SandboxContent: ({ className, ...props }: SandboxContentProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxTabsProps = ComponentProps<typeof Tabs>;
export declare const SandboxTabs: ({ className, ...props }: SandboxTabsProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxTabsBarProps = ComponentProps<"div">;
export declare const SandboxTabsBar: ({ className, ...props }: SandboxTabsBarProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxTabsListProps = ComponentProps<typeof TabsList>;
export declare const SandboxTabsList: ({ className, ...props }: SandboxTabsListProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxTabsTriggerProps = ComponentProps<typeof TabsTrigger>;
export declare const SandboxTabsTrigger: ({ className, ...props }: SandboxTabsTriggerProps) => import("react/jsx-runtime").JSX.Element;
export type SandboxTabContentProps = ComponentProps<typeof TabsContent>;
export declare const SandboxTabContent: ({ className, ...props }: SandboxTabContentProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=sandbox.d.ts.map