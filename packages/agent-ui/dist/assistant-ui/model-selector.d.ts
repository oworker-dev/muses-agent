import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { type VariantProps } from "class-variance-authority";
import { PopoverContent, PopoverTrigger } from "../ui/popover.js";
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command.js";
export type ModelSelectorEffortOption = {
    id: string;
    name: string;
};
export declare const DEFAULT_EFFORT_OPTIONS: readonly ModelSelectorEffortOption[];
export type ModelOption = {
    id: string;
    name: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
    keywords?: readonly string[];
    efforts?: boolean | readonly ModelSelectorEffortOption[];
};
export declare function resolveModelEffort(models: readonly ModelOption[], modelId: string | undefined, effort: string | undefined): string | undefined;
export declare function useModelSelectorEfforts(): {
    efforts: readonly ModelSelectorEffortOption[] | undefined;
    effort: string | undefined;
    setEffort: (effort: string) => void;
};
export type ModelSelectorRootProps = {
    models: readonly ModelOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    effort?: string;
    defaultEffort?: string;
    onEffortChange?: (effort: string) => void;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
};
declare function ModelSelectorRoot({ models, value: valueProp, defaultValue, onValueChange, effort: effortProp, defaultEffort, onEffortChange, open: openProp, defaultOpen, onOpenChange, children, }: ModelSelectorRootProps): import("react/jsx-runtime").JSX.Element;
export declare const modelSelectorTriggerVariants: (props?: ({
    variant?: "outline" | "ghost" | "muted" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export type ModelSelectorTriggerProps = ComponentPropsWithoutRef<typeof PopoverTrigger> & VariantProps<typeof modelSelectorTriggerVariants>;
declare function ModelSelectorTrigger({ className, variant, size, children, onKeyDown, ...props }: ModelSelectorTriggerProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorValueProps = {
    placeholder?: ReactNode;
    showEffort?: boolean;
    className?: string;
};
declare function ModelSelectorValue({ placeholder, showEffort, className, }: ModelSelectorValueProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorContentProps = Omit<ComponentPropsWithoutRef<typeof PopoverContent>, "side"> & {
    side?: ComponentPropsWithoutRef<typeof PopoverContent>["side"];
    searchable?: boolean;
    effortLabel?: ReactNode;
};
declare function ModelSelectorFocusAnchor(): import("react/jsx-runtime").JSX.Element;
declare function ModelSelectorContent({ className, align, effortLabel, side, sideOffset, searchable, children, ...props }: ModelSelectorContentProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorSearchProps = ComponentPropsWithoutRef<typeof CommandInput>;
declare function ModelSelectorSearch({ placeholder, ...props }: ModelSelectorSearchProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorListProps = ComponentPropsWithoutRef<typeof CommandList>;
declare function ModelSelectorList({ className, children, ...props }: ModelSelectorListProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorEmptyProps = ComponentPropsWithoutRef<typeof CommandEmpty>;
declare function ModelSelectorEmpty({ children, ...props }: ModelSelectorEmptyProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorGroupProps = ComponentPropsWithoutRef<typeof CommandGroup>;
declare function ModelSelectorGroup(props: ModelSelectorGroupProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorSeparatorProps = ComponentPropsWithoutRef<typeof CommandSeparator>;
declare function ModelSelectorSeparator(props: ModelSelectorSeparatorProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorItemProps = Omit<ComponentPropsWithoutRef<typeof CommandItem>, "value"> & {
    model: ModelOption;
};
declare function ModelSelectorItem({ model, className, children, onSelect, ...props }: ModelSelectorItemProps): import("react/jsx-runtime").JSX.Element;
export type ModelSelectorEffortProps = ComponentPropsWithoutRef<"div"> & {
    label?: ReactNode;
};
declare function ModelSelectorEffort({ label, className, onKeyDown, ...props }: ModelSelectorEffortProps): import("react/jsx-runtime").JSX.Element | null;
export type ModelSelectorProps = Omit<ModelSelectorRootProps, "children"> & VariantProps<typeof modelSelectorTriggerVariants> & {
    searchable?: boolean;
    align?: ModelSelectorContentProps["align"];
    className?: string;
    contentClassName?: string;
    effortLabel?: ReactNode;
    triggerLabel?: string;
    valueClassName?: string;
};
declare const ModelSelectorImpl: ({ searchable, variant, size, align, className, contentClassName, effortLabel, triggerLabel, valueClassName, ...rootProps }: ModelSelectorProps) => import("react/jsx-runtime").JSX.Element;
type ModelSelectorComponent = typeof ModelSelectorImpl & {
    displayName?: string;
    Root: typeof ModelSelectorRoot;
    Trigger: typeof ModelSelectorTrigger;
    Value: typeof ModelSelectorValue;
    Content: typeof ModelSelectorContent;
    Search: typeof ModelSelectorSearch;
    FocusAnchor: typeof ModelSelectorFocusAnchor;
    List: typeof ModelSelectorList;
    Empty: typeof ModelSelectorEmpty;
    Group: typeof ModelSelectorGroup;
    Separator: typeof ModelSelectorSeparator;
    Item: typeof ModelSelectorItem;
    Effort: typeof ModelSelectorEffort;
};
declare const ModelSelector: ModelSelectorComponent;
export { ModelSelector, ModelSelectorRoot, ModelSelectorTrigger, ModelSelectorValue, ModelSelectorContent, ModelSelectorSearch, ModelSelectorFocusAnchor, ModelSelectorList, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorSeparator, ModelSelectorItem, ModelSelectorEffort, };
//# sourceMappingURL=model-selector.d.ts.map