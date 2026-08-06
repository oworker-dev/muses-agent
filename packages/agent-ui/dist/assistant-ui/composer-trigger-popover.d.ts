import { type ComponentPropsWithoutRef, type FC } from "react";
import { ComposerPrimitive, type Unstable_DirectiveFormatter, type Unstable_TriggerItem } from "@assistant-ui/react";
type IconComponent = FC<{
    className?: string;
}>;
type DirectiveBehaviorProps = {
    formatter?: Unstable_DirectiveFormatter | undefined;
    onInserted?: ((item: Unstable_TriggerItem) => void) | undefined;
};
type ActionBehaviorProps = {
    formatter?: Unstable_DirectiveFormatter | undefined;
    onExecute: (item: Unstable_TriggerItem) => void;
    removeOnExecute?: boolean | undefined;
};
type ComposerTriggerPopoverBaseProps = Omit<ComponentPropsWithoutRef<typeof ComposerPrimitive.Unstable_TriggerPopover>, "children"> & {
    iconMap?: Record<string, IconComponent>;
    fallbackIcon?: IconComponent;
    backLabel?: string;
    emptyCategoriesLabel?: string;
    emptyItemsLabel?: string;
    loadingLabel?: string;
};
type ComposerTriggerPopoverProps = ComposerTriggerPopoverBaseProps & ({
    directive: DirectiveBehaviorProps;
    action?: never;
} | {
    action: ActionBehaviorProps;
    directive?: never;
});
export declare const ComposerTriggerPopover: FC<ComposerTriggerPopoverProps>;
export {};
//# sourceMappingURL=composer-trigger-popover.d.ts.map