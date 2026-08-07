"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useRef, useState, } from "react";
import { ChevronDownIcon, LoaderIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { useScrollLock } from "@assistant-ui/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
const ANIMATION_DURATION = 200;
const toolGroupVariants = cva("aui-tool-group-root group/tool-group w-full", {
    variants: {
        variant: {
            outline: "rounded-lg border py-3",
            ghost: "",
            muted: "border-muted-foreground/30 bg-muted/30 rounded-lg border py-3",
        },
    },
    defaultVariants: { variant: "outline" },
});
function ToolGroupRoot({ className, variant, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen = false, children, ...props }) {
    const collapsibleRef = useRef(null);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
    const handleOpenChange = useCallback((open) => {
        lockScroll();
        if (!isControlled) {
            setUncontrolledOpen(open);
        }
        controlledOnOpenChange?.(open);
    }, [lockScroll, isControlled, controlledOnOpenChange]);
    return (_jsx(Collapsible, { ref: collapsibleRef, "data-slot": "tool-group-root", "data-variant": variant ?? "outline", open: isOpen, onOpenChange: handleOpenChange, className: cn(toolGroupVariants({ variant }), "group/tool-group-root", className), style: {
            "--animation-duration": `${ANIMATION_DURATION}ms`,
        }, ...props, children: children }));
}
function ToolGroupTrigger({ count, active = false, label: labelProp, className, ...props }) {
    const label = labelProp ?? `${count} tool ${count === 1 ? "call" : "calls"}`;
    return (_jsxs(CollapsibleTrigger, { "data-slot": "tool-group-trigger", className: cn("aui-tool-group-trigger group/trigger flex origin-left items-center gap-2 text-sm transition-[color,scale] active:scale-[0.98]", "group-data-[variant=ghost]/tool-group-root:text-muted-foreground group-data-[variant=ghost]/tool-group-root:hover:text-foreground group-data-[variant=ghost]/tool-group-root:py-1.5", "group-data-[variant=outline]/tool-group-root:w-full group-data-[variant=outline]/tool-group-root:px-4", "group-data-[variant=muted]/tool-group-root:w-full group-data-[variant=muted]/tool-group-root:px-4", className), ...props, children: [active && (_jsx(LoaderIcon, { "data-slot": "tool-group-trigger-loader", className: "aui-tool-group-trigger-loader size-3 shrink-0 animate-spin [animation-duration:0.6s]" })), _jsx("span", { "data-slot": "tool-group-trigger-label", className: cn("aui-tool-group-trigger-label-wrapper relative inline-block text-start leading-none font-medium", active && "shimmer motion-reduce:animate-none", "group-data-[variant=ghost]/tool-group-root:font-normal", "group-data-[variant=outline]/tool-group-root:grow", "group-data-[variant=muted]/tool-group-root:grow"), children: _jsx("span", { className: "text-xs", children: label }) }), _jsx(ChevronDownIcon, { "data-slot": "tool-group-trigger-chevron", className: cn("aui-tool-group-trigger-chevron size-3 shrink-0", "transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none", "-rotate-90", "group-data-open/trigger:rotate-0", "group-data-panel-open/trigger:rotate-0") })] }));
}
function ToolGroupContent({ className, children, ...props }) {
    return (_jsx(CollapsibleContent, { "data-slot": "tool-group-content", className: cn("aui-tool-group-content relative overflow-hidden text-sm outline-none", "group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none", "data-closed:animate-collapsible-up", "data-open:animate-collapsible-down", "data-closed:fill-mode-forwards", "data-closed:pointer-events-none", "data-open:duration-(--animation-duration)", "data-closed:duration-(--animation-duration)", className), ...props, children: _jsx("div", { className: cn("mt-2 flex flex-col gap-2", "group-data-[variant=ghost]/tool-group-root:mt-1.5 group-data-[variant=ghost]/tool-group-root:gap-2", "group-data-[variant=outline]/tool-group-root:mt-3 group-data-[variant=outline]/tool-group-root:border-t group-data-[variant=outline]/tool-group-root:px-4 group-data-[variant=outline]/tool-group-root:pt-3", "group-data-[variant=muted]/tool-group-root:mt-3 group-data-[variant=muted]/tool-group-root:border-t group-data-[variant=muted]/tool-group-root:px-4 group-data-[variant=muted]/tool-group-root:pt-3", "[&>*]:animate-in [&>*]:fade-in-0 [&>*]:blur-in-[2px] [&>*]:slide-in-from-top-1 [&>*]:duration-(--animation-duration) [&>*]:ease-[cubic-bezier(0.32,0.72,0,1)]", "[&>*]:motion-reduce:animate-none", "[&>*:nth-child(2)]:[animation-delay:40ms]", "[&>*:nth-child(3)]:[animation-delay:80ms]", "[&>*:nth-child(4)]:[animation-delay:120ms]", "[&>*:nth-child(n+5)]:[animation-delay:160ms]"), children: children }) }));
}
const ToolGroupImpl = ({ children, startIndex, endIndex }) => {
    const toolCount = endIndex - startIndex + 1;
    return (_jsxs(ToolGroupRoot, { children: [_jsx(ToolGroupTrigger, { count: toolCount }), _jsx(ToolGroupContent, { children: children })] }));
};
const ToolGroup = memo(ToolGroupImpl);
ToolGroup.displayName = "ToolGroup";
ToolGroup.Root = ToolGroupRoot;
ToolGroup.Trigger = ToolGroupTrigger;
ToolGroup.Content = ToolGroupContent;
export { ToolGroup, ToolGroupRoot, ToolGroupTrigger, ToolGroupContent, toolGroupVariants, };
//# sourceMappingURL=tool-group.js.map