"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { Separator } from "../ui/separator.js";
import { Tooltip, TooltipContent, TooltipTrigger, } from "../ui/tooltip.js";
import { cn } from "../utils.js";
import { BookmarkIcon } from "lucide-react";
export const Checkpoint = ({ className, children, ...props }) => (_jsxs("div", { className: cn("flex items-center gap-0.5 overflow-hidden text-muted-foreground", className), ...props, children: [children, _jsx(Separator, {})] }));
export const CheckpointIcon = ({ className, children, ...props }) => children ?? (_jsx(BookmarkIcon, { className: cn("size-4 shrink-0", className), ...props }));
export const CheckpointTrigger = ({ children, variant = "ghost", size = "sm", tooltip, ...props }) => tooltip ? (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { size: size, type: "button", variant: variant, ...props, children: children }) }), _jsx(TooltipContent, { align: "start", side: "bottom", children: tooltip })] })) : (_jsx(Button, { size: size, type: "button", variant: variant, ...props, children: children }));
//# sourceMappingURL=checkpoint.js.map