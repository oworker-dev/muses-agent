import * as React from "react";
import { Direction } from "radix-ui";
declare function DirectionProvider({ dir, direction, children, }: React.ComponentProps<typeof Direction.DirectionProvider> & {
    direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"];
}): import("react/jsx-runtime").JSX.Element;
declare const useDirection: typeof Direction.useDirection;
export { DirectionProvider, useDirection };
//# sourceMappingURL=direction.d.ts.map