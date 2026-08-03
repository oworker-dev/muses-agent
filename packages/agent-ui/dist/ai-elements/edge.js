import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getBezierPath, getSimpleBezierPath, Position, useInternalNode, } from "@xyflow/react";
const Temporary = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, }) => {
    const [edgePath] = getSimpleBezierPath({
        sourcePosition,
        sourceX,
        sourceY,
        targetPosition,
        targetX,
        targetY,
    });
    return (_jsx(BaseEdge, { className: "stroke-1 stroke-ring", id: id, path: edgePath, style: {
            strokeDasharray: "5, 5",
        } }));
};
const getHandleCoordsByPosition = (node, handlePosition) => {
    const handleType = handlePosition === Position.Left ? "target" : "source";
    const handle = node.internals.handleBounds?.[handleType]?.find((h) => h.position === handlePosition);
    if (!handle) {
        return [0, 0];
    }
    let offsetX = handle.width / 2;
    let offsetY = handle.height / 2;
    switch (handlePosition) {
        case Position.Left: {
            offsetX = 0;
            break;
        }
        case Position.Right: {
            offsetX = handle.width;
            break;
        }
        case Position.Top: {
            offsetY = 0;
            break;
        }
        case Position.Bottom: {
            offsetY = handle.height;
            break;
        }
        default: {
            throw new Error(`Invalid handle position: ${handlePosition}`);
        }
    }
    const x = node.internals.positionAbsolute.x + handle.x + offsetX;
    const y = node.internals.positionAbsolute.y + handle.y + offsetY;
    return [x, y];
};
const getEdgeParams = (source, target) => {
    const sourcePos = Position.Right;
    const [sx, sy] = getHandleCoordsByPosition(source, sourcePos);
    const targetPos = Position.Left;
    const [tx, ty] = getHandleCoordsByPosition(target, targetPos);
    return {
        sourcePos,
        sx,
        sy,
        targetPos,
        tx,
        ty,
    };
};
const Animated = ({ id, source, target, markerEnd, style }) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    if (!(sourceNode && targetNode)) {
        return null;
    }
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
    const [edgePath] = getBezierPath({
        sourcePosition: sourcePos,
        sourceX: sx,
        sourceY: sy,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    });
    return (_jsxs(_Fragment, { children: [_jsx(BaseEdge, { id: id, markerEnd: markerEnd, path: edgePath, style: style }), _jsx("circle", { fill: "var(--primary)", r: "4", children: _jsx("animateMotion", { dur: "2s", path: edgePath, repeatCount: "indefinite" }) })] }));
};
export const Edge = {
    Animated,
    Temporary,
};
//# sourceMappingURL=edge.js.map