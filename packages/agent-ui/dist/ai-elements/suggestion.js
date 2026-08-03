"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { ScrollArea, ScrollBar, } from "../ui/scroll-area.js";
import { cn } from "../utils.js";
import { useCallback } from "react";
export const Suggestions = ({ className, children, ...props }) => (_jsxs(ScrollArea, { className: "w-full overflow-x-auto whitespace-nowrap", ...props, children: [_jsx("div", { className: cn("flex w-max flex-nowrap items-center gap-2", className), children: children }), _jsx(ScrollBar, { className: "hidden", orientation: "horizontal" })] }));
export const Suggestion = ({ suggestion, onClick, className, variant = "outline", size = "sm", children, ...props }) => {
    const handleClick = useCallback(() => {
        onClick?.(suggestion);
    }, [onClick, suggestion]);
    return (_jsx(Button, { className: cn("cursor-pointer rounded-full px-4", className), onClick: handleClick, size: size, type: "button", variant: variant, ...props, children: children || suggestion }));
};
//# sourceMappingURL=suggestion.js.map