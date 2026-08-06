"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Slot } from "radix-ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "../ui/tooltip.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
export const TooltipIconButton = forwardRef(({ children, tooltip, side = "bottom", className, ...rest }, ref) => {
    return (_jsx(TooltipProvider, { delayDuration: 0, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "icon", ...rest, className: cn("aui-button-icon size-6 p-1 active:scale-90", className), ref: ref, children: [_jsx(Slot.Slottable, { children: children }), _jsx("span", { className: "aui-sr-only sr-only", children: tooltip })] }) }), _jsx(TooltipContent, { side: side, children: tooltip })] }) }));
});
TooltipIconButton.displayName = "TooltipIconButton";
//# sourceMappingURL=tooltip-icon-button.js.map