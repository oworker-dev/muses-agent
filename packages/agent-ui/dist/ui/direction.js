"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Direction } from "radix-ui";
function DirectionProvider({ dir, direction, children, }) {
    return (_jsx(Direction.DirectionProvider, { dir: direction ?? dir, children: children }));
}
const useDirection = Direction.useDirection;
export { DirectionProvider, useDirection };
//# sourceMappingURL=direction.js.map