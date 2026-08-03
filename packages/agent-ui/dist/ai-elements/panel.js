import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils.js";
import { Panel as PanelPrimitive } from "@xyflow/react";
export const Panel = ({ className, ...props }) => (_jsx(PanelPrimitive, { className: cn("m-4 overflow-hidden rounded-md border bg-card p-1", className), ...props }));
//# sourceMappingURL=panel.js.map