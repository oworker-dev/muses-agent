import * as React from "react";
declare function NativeSelect({ className, size, ...props }: Omit<React.ComponentProps<"select">, "size"> & {
    size?: "sm" | "default";
}): import("react/jsx-runtime").JSX.Element;
declare function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">): import("react/jsx-runtime").JSX.Element;
declare function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">): import("react/jsx-runtime").JSX.Element;
export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
//# sourceMappingURL=native-select.d.ts.map