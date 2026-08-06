import { type FC, type PropsWithChildren } from "react";
import { type VariantProps } from "class-variance-authority";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
declare const toolGroupVariants: (props?: ({
    variant?: "outline" | "ghost" | "muted" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export type ToolGroupRootProps = Omit<React.ComponentProps<typeof Collapsible>, "open" | "onOpenChange"> & VariantProps<typeof toolGroupVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
};
declare function ToolGroupRoot({ className, variant, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen, children, ...props }: ToolGroupRootProps): import("react/jsx-runtime").JSX.Element;
declare function ToolGroupTrigger({ count, active, label: labelProp, className, ...props }: React.ComponentProps<typeof CollapsibleTrigger> & {
    count: number;
    active?: boolean;
    label?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function ToolGroupContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>): import("react/jsx-runtime").JSX.Element;
type ToolGroupComponent = FC<PropsWithChildren<{
    startIndex: number;
    endIndex: number;
}>> & {
    Root: typeof ToolGroupRoot;
    Trigger: typeof ToolGroupTrigger;
    Content: typeof ToolGroupContent;
};
declare const ToolGroup: ToolGroupComponent;
export { ToolGroup, ToolGroupRoot, ToolGroupTrigger, ToolGroupContent, toolGroupVariants, };
//# sourceMappingURL=tool-group.d.ts.map