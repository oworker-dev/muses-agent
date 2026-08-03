import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare function BubbleGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare const bubbleVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "muted" | "tinted" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Bubble({ variant, align, className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end";
}): import("react/jsx-runtime").JSX.Element;
declare function BubbleContent({ asChild, className, ...props }: React.ComponentProps<"div"> & {
    asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function BubbleReactions({ side, align, className, ...props }: React.ComponentProps<"div"> & {
    align?: "start" | "end";
    side?: "top" | "bottom";
}): import("react/jsx-runtime").JSX.Element;
export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };
//# sourceMappingURL=bubble.d.ts.map