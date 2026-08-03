import { Button } from "../ui/button.js";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "../ui/command.js";
import { Popover, PopoverContent } from "../ui/popover.js";
import type { ComponentProps, ReactNode } from "react";
export declare const useAudioDevices: () => {
    devices: MediaDeviceInfo[];
    error: string | null;
    hasPermission: boolean;
    loadDevices: () => Promise<void>;
    loading: boolean;
};
export type MicSelectorProps = ComponentProps<typeof Popover> & {
    defaultValue?: string;
    value?: string | undefined;
    onValueChange?: (value: string | undefined) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};
export declare const MicSelector: ({ defaultValue, value: controlledValue, onValueChange: controlledOnValueChange, defaultOpen, open: controlledOpen, onOpenChange: controlledOnOpenChange, ...props }: MicSelectorProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorTriggerProps = ComponentProps<typeof Button>;
export declare const MicSelectorTrigger: ({ children, ...props }: MicSelectorTriggerProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorContentProps = ComponentProps<typeof Command> & {
    popoverOptions?: ComponentProps<typeof PopoverContent>;
};
export declare const MicSelectorContent: ({ className, popoverOptions, ...props }: MicSelectorContentProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorInputProps = ComponentProps<typeof CommandInput> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
};
export declare const MicSelectorInput: ({ ...props }: MicSelectorInputProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorListProps = Omit<ComponentProps<typeof CommandList>, "children"> & {
    children: (devices: MediaDeviceInfo[]) => ReactNode;
};
export declare const MicSelectorList: ({ children, ...props }: MicSelectorListProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;
export declare const MicSelectorEmpty: ({ children, ...props }: MicSelectorEmptyProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorItemProps = ComponentProps<typeof CommandItem>;
export declare const MicSelectorItem: (props: MicSelectorItemProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorLabelProps = ComponentProps<"span"> & {
    device: MediaDeviceInfo;
};
export declare const MicSelectorLabel: ({ device, className, ...props }: MicSelectorLabelProps) => import("react/jsx-runtime").JSX.Element;
export type MicSelectorValueProps = ComponentProps<"span">;
export declare const MicSelectorValue: ({ className, ...props }: MicSelectorValueProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=mic-selector.d.ts.map