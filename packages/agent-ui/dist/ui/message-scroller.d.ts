import * as React from "react";
import { MessageScroller as MessageScrollerPrimitive, useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility } from "@shadcn/react/message-scroller";
import { Button } from "./button.js";
declare function MessageScrollerProvider(props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>): import("react/jsx-runtime").JSX.Element;
declare function MessageScroller({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function MessageScrollerViewport({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>): import("react/jsx-runtime").JSX.Element;
declare function MessageScrollerContent({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Content>): import("react/jsx-runtime").JSX.Element;
declare function MessageScrollerItem({ className, scrollAnchor, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Item>): import("react/jsx-runtime").JSX.Element;
declare function MessageScrollerButton({ direction, className, children, render, variant, size, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Button> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">): import("react/jsx-runtime").JSX.Element;
export { MessageScrollerProvider, MessageScroller, MessageScrollerViewport, MessageScrollerContent, MessageScrollerItem, MessageScrollerButton, useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility, };
//# sourceMappingURL=message-scroller.d.ts.map