"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Alert, AlertDescription } from "../ui/alert.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import { createContext, useContext, useMemo } from "react";
const ConfirmationContext = createContext(null);
const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error("Confirmation components must be used within Confirmation");
    }
    return context;
};
export const Confirmation = ({ className, approval, state, ...props }) => {
    const contextValue = useMemo(() => ({ approval, state }), [approval, state]);
    if (!approval || state === "input-streaming" || state === "input-available") {
        return null;
    }
    return (_jsx(ConfirmationContext.Provider, { value: contextValue, children: _jsx(Alert, { className: cn("flex flex-col gap-2", className), ...props }) }));
};
export const ConfirmationTitle = ({ className, ...props }) => (_jsx(AlertDescription, { className: cn("inline", className), ...props }));
export const ConfirmationRequest = ({ children }) => {
    const { state } = useConfirmation();
    if (state !== "approval-requested") {
        return null;
    }
    return children;
};
export const ConfirmationAccepted = ({ children, }) => {
    const { approval, state } = useConfirmation();
    if (!approval?.approved ||
        (state !== "approval-responded" &&
            state !== "output-denied" &&
            state !== "output-available")) {
        return null;
    }
    return children;
};
export const ConfirmationRejected = ({ children, }) => {
    const { approval, state } = useConfirmation();
    if (approval?.approved !== false ||
        (state !== "approval-responded" &&
            state !== "output-denied" &&
            state !== "output-available")) {
        return null;
    }
    return children;
};
export const ConfirmationActions = ({ className, ...props }) => {
    const { state } = useConfirmation();
    if (state !== "approval-requested") {
        return null;
    }
    return (_jsx("div", { className: cn("flex items-center justify-end gap-2 self-end", className), ...props }));
};
export const ConfirmationAction = (props) => (_jsx(Button, { className: "h-8 px-3 text-sm", type: "button", ...props }));
//# sourceMappingURL=confirmation.js.map