"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from "react";
import { ComposerPrimitive, unstable_defaultDirectiveFormatter, unstable_useTriggerPopoverScopeContext, } from "@assistant-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { cn } from "../utils.js";
function resolveIcon(iconKey, iconMap, fallback) {
    if (iconKey && iconMap?.[iconKey])
        return iconMap[iconKey];
    return fallback;
}
const Categories = ({ iconMap, fallbackIcon, emptyLabel, }) => (_jsx(ComposerPrimitive.Unstable_TriggerPopoverCategories, { children: (categories) => (_jsxs("div", { "data-slot": "composer-trigger-popover-categories", className: "flex flex-col py-1", children: [categories.map((cat) => {
                const Icon = resolveIcon(cat.id, iconMap, fallbackIcon);
                return (_jsxs(ComposerPrimitive.Unstable_TriggerPopoverCategoryItem, { categoryId: cat.id, className: "hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors outline-none", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Icon, { className: "text-muted-foreground size-4" }), cat.label] }), _jsx(ChevronRightIcon, { className: "text-muted-foreground size-4" })] }, cat.id));
            }), categories.length === 0 && (_jsx("div", { className: "text-muted-foreground px-3 py-2 text-sm", children: emptyLabel }))] })) }));
const Items = ({ iconMap, fallbackIcon, backLabel, emptyLabel, loadingLabel, }) => {
    const { isLoading } = unstable_useTriggerPopoverScopeContext();
    return (_jsx(ComposerPrimitive.Unstable_TriggerPopoverItems, { children: (items) => (_jsxs("div", { "data-slot": "composer-trigger-popover-items", className: "flex flex-col", children: [_jsxs(ComposerPrimitive.Unstable_TriggerPopoverBack, { className: "text-muted-foreground hover:bg-accent flex cursor-pointer items-center gap-1.5 border-b px-3 py-2 text-xs tracking-wide uppercase transition-colors", children: [_jsx(ChevronLeftIcon, { className: "size-3.5" }), backLabel] }), _jsxs("div", { className: "py-1", children: [items.map((item, index) => {
                            const iconKey = typeof item.metadata?.icon === "string"
                                ? item.metadata.icon
                                : undefined;
                            const Icon = resolveIcon(iconKey, iconMap, fallbackIcon);
                            return (_jsxs(ComposerPrimitive.Unstable_TriggerPopoverItem, { item: item, index: index, className: "hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start transition-colors outline-none", children: [_jsxs("span", { className: "flex items-center gap-2 text-sm font-medium", children: [_jsx(Icon, { className: "text-primary size-3.5" }), item.label] }), item.description && (_jsx("span", { className: "text-muted-foreground ms-5.5 text-xs leading-tight", children: item.description }))] }, item.id));
                        }), items.length === 0 && (_jsx("div", { className: "text-muted-foreground px-3 py-2 text-sm", children: isLoading ? loadingLabel : emptyLabel }))] })] })) }));
};
const ComposerTriggerPopoverImpl = ({ iconMap, fallbackIcon = SparklesIcon, backLabel = "Back", emptyCategoriesLabel = "No items available", emptyItemsLabel = "No matching items", loadingLabel = "Loading…", className, directive, action, ...props }) => {
    return (_jsxs(ComposerPrimitive.Unstable_TriggerPopover, { "data-slot": "composer-trigger-popover", className: cn("aui-composer-trigger-popover bg-popover text-popover-foreground absolute start-0 bottom-full z-50 mb-2 w-64 overflow-hidden rounded-xl border shadow-lg", className), ...props, children: [directive ? (_jsx(ComposerPrimitive.Unstable_TriggerPopover.Directive, { formatter: directive.formatter ?? unstable_defaultDirectiveFormatter, onInserted: directive.onInserted })) : action ? (_jsx(ComposerPrimitive.Unstable_TriggerPopover.Action, { formatter: action.formatter ?? unstable_defaultDirectiveFormatter, onExecute: action.onExecute, removeOnExecute: action.removeOnExecute })) : null, _jsx(Categories, { iconMap: iconMap, fallbackIcon: fallbackIcon, emptyLabel: emptyCategoriesLabel }), _jsx(Items, { iconMap: iconMap, fallbackIcon: fallbackIcon, backLabel: backLabel, emptyLabel: emptyItemsLabel, loadingLabel: loadingLabel })] }));
};
ComposerTriggerPopoverImpl.displayName = "ComposerTriggerPopover";
export const ComposerTriggerPopover = memo(ComposerTriggerPopoverImpl);
//# sourceMappingURL=composer-trigger-popover.js.map