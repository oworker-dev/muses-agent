import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { Button } from "./button.js";
declare function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogContent({ className, size, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
    size?: "default" | "sm";
}): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogAction({ className, variant, size, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogCancel({ className, variant, size, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">): import("react/jsx-runtime").JSX.Element;
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, };
//# sourceMappingURL=alert-dialog.d.ts.map