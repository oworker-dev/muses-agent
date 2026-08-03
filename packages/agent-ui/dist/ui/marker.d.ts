import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const markerVariants: (props?: ({
    variant?: "default" | "separator" | "border" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Marker({ className, variant, asChild, ...props }: React.ComponentProps<"div"> & VariantProps<typeof markerVariants> & {
    asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function MarkerIcon({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
declare function MarkerContent({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
export { Marker, MarkerIcon, MarkerContent, markerVariants };
//# sourceMappingURL=marker.d.ts.map