import { ThreadListPrimitive } from "@assistant-ui/react";
import { type ComponentPropsWithoutRef, type FC } from "react";
export declare const ThreadList: FC;
export declare const ThreadListSearch: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLInputElement> & import("react").InputHTMLAttributes<HTMLInputElement>, "ref">, "value" | "onChange"> & {
    value: string;
    onValueChange: (value: string) => void;
} & import("react").RefAttributes<HTMLInputElement>>;
export declare const ThreadListRoot: FC<ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>>;
export declare const ThreadListItems: FC<ComponentPropsWithoutRef<"div"> & {
    searchQuery?: string;
}>;
export declare const ThreadListNew: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & import("class-variance-authority").VariantProps<(props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string> & {
    asChild?: boolean;
}, "ref"> & {
    labelClassName?: string;
} & import("react").RefAttributes<HTMLButtonElement>>;
export declare const ThreadListItem: FC;
//# sourceMappingURL=thread-list.d.ts.map