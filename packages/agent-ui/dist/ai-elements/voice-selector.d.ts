import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "../ui/command.js";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog.js";
import type { ComponentProps, ReactNode } from "react";
interface VoiceSelectorContextValue {
    value: string | undefined;
    setValue: (value: string | undefined) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}
export declare const useVoiceSelector: () => VoiceSelectorContextValue;
export type VoiceSelectorProps = ComponentProps<typeof Dialog> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string | undefined) => void;
};
export declare const VoiceSelector: ({ value: valueProp, defaultValue, onValueChange, open: openProp, defaultOpen, onOpenChange, children, ...props }: VoiceSelectorProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;
export declare const VoiceSelectorTrigger: (props: VoiceSelectorTriggerProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorContentProps = ComponentProps<typeof DialogContent> & {
    title?: ReactNode;
};
export declare const VoiceSelectorContent: ({ className, children, title, ...props }: VoiceSelectorContentProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorDialogProps = ComponentProps<typeof CommandDialog>;
export declare const VoiceSelectorDialog: (props: VoiceSelectorDialogProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorInputProps = ComponentProps<typeof CommandInput>;
export declare const VoiceSelectorInput: ({ className, ...props }: VoiceSelectorInputProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorListProps = ComponentProps<typeof CommandList>;
export declare const VoiceSelectorList: (props: VoiceSelectorListProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;
export declare const VoiceSelectorEmpty: (props: VoiceSelectorEmptyProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorGroupProps = ComponentProps<typeof CommandGroup>;
export declare const VoiceSelectorGroup: (props: VoiceSelectorGroupProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorItemProps = ComponentProps<typeof CommandItem>;
export declare const VoiceSelectorItem: ({ className, ...props }: VoiceSelectorItemProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;
export declare const VoiceSelectorShortcut: (props: VoiceSelectorShortcutProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorSeparatorProps = ComponentProps<typeof CommandSeparator>;
export declare const VoiceSelectorSeparator: (props: VoiceSelectorSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorGenderProps = ComponentProps<"span"> & {
    value?: "male" | "female" | "transgender" | "androgyne" | "non-binary" | "intersex";
};
export declare const VoiceSelectorGender: ({ className, value, children, ...props }: VoiceSelectorGenderProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorAccentProps = ComponentProps<"span"> & {
    value?: "american" | "british" | "australian" | "canadian" | "irish" | "scottish" | "indian" | "south-african" | "new-zealand" | "spanish" | "french" | "german" | "italian" | "portuguese" | "brazilian" | "mexican" | "argentinian" | "japanese" | "chinese" | "korean" | "russian" | "arabic" | "dutch" | "swedish" | "norwegian" | "danish" | "finnish" | "polish" | "turkish" | "greek" | string;
};
export declare const VoiceSelectorAccent: ({ className, value, children, ...props }: VoiceSelectorAccentProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorAgeProps = ComponentProps<"span">;
export declare const VoiceSelectorAge: ({ className, ...props }: VoiceSelectorAgeProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorNameProps = ComponentProps<"span">;
export declare const VoiceSelectorName: ({ className, ...props }: VoiceSelectorNameProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorDescriptionProps = ComponentProps<"span">;
export declare const VoiceSelectorDescription: ({ className, ...props }: VoiceSelectorDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorAttributesProps = ComponentProps<"div">;
export declare const VoiceSelectorAttributes: ({ className, children, ...props }: VoiceSelectorAttributesProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorBulletProps = ComponentProps<"span">;
export declare const VoiceSelectorBullet: ({ className, ...props }: VoiceSelectorBulletProps) => import("react/jsx-runtime").JSX.Element;
export type VoiceSelectorPreviewProps = Omit<ComponentProps<"button">, "children"> & {
    playing?: boolean;
    loading?: boolean;
    onPlay?: () => void;
};
export declare const VoiceSelectorPreview: ({ className, playing, loading, onPlay, onClick, ...props }: VoiceSelectorPreviewProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=voice-selector.d.ts.map