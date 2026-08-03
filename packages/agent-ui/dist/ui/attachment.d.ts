import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Button } from "./button.js";
declare const attachmentVariants: (props?: ({
    size?: "default" | "xs" | "sm" | null | undefined;
    orientation?: "horizontal" | "vertical" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Attachment({ className, state, size, orientation, ...props }: React.ComponentProps<"div"> & VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done";
}): import("react/jsx-runtime").JSX.Element;
declare const attachmentMediaVariants: (props?: ({
    variant?: "icon" | "image" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function AttachmentMedia({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>): import("react/jsx-runtime").JSX.Element;
declare function AttachmentContent({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
declare function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
declare function AttachmentActions({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AttachmentAction({ className, variant, size, ...props }: React.ComponentProps<typeof Button>): import("react/jsx-runtime").JSX.Element;
declare function AttachmentTrigger({ className, asChild, type, ...props }: React.ComponentProps<"button"> & {
    asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
export { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger, };
//# sourceMappingURL=attachment.d.ts.map