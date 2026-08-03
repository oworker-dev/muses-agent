"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Switch } from "../ui/switch.js";
import { cn } from "../utils.js";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
const noop = () => { };
const EnvironmentVariablesContext = createContext({
    setShowValues: noop,
    showValues: false,
});
export const EnvironmentVariables = ({ showValues: controlledShowValues, defaultShowValues = false, onShowValuesChange, className, children, ...props }) => {
    const [internalShowValues, setInternalShowValues] = useState(defaultShowValues);
    const showValues = controlledShowValues ?? internalShowValues;
    const setShowValues = useCallback((show) => {
        setInternalShowValues(show);
        onShowValuesChange?.(show);
    }, [onShowValuesChange]);
    const contextValue = useMemo(() => ({ setShowValues, showValues }), [setShowValues, showValues]);
    return (_jsx(EnvironmentVariablesContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("rounded-lg border bg-background", className), ...props, children: children }) }));
};
export const EnvironmentVariablesHeader = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between border-b px-4 py-3", className), ...props, children: children }));
export const EnvironmentVariablesTitle = ({ className, children, ...props }) => (_jsx("h3", { className: cn("font-medium text-sm", className), ...props, children: children ?? "Environment Variables" }));
export const EnvironmentVariablesToggle = ({ className, ...props }) => {
    const { showValues, setShowValues } = useContext(EnvironmentVariablesContext);
    return (_jsxs("div", { className: cn("flex items-center gap-2", className), children: [_jsx("span", { className: "text-muted-foreground text-xs", children: showValues ? _jsx(EyeIcon, { size: 14 }) : _jsx(EyeOffIcon, { size: 14 }) }), _jsx(Switch, { "aria-label": "Toggle value visibility", checked: showValues, onCheckedChange: setShowValues, ...props })] }));
};
export const EnvironmentVariablesContent = ({ className, children, ...props }) => (_jsx("div", { className: cn("divide-y", className), ...props, children: children }));
const EnvironmentVariableContext = createContext({
    name: "",
    value: "",
});
export const EnvironmentVariableGroup = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center gap-2", className), ...props, children: children }));
export const EnvironmentVariableName = ({ className, children, ...props }) => {
    const { name } = useContext(EnvironmentVariableContext);
    return (_jsx("span", { className: cn("font-mono text-sm", className), ...props, children: children ?? name }));
};
export const EnvironmentVariableValue = ({ className, children, ...props }) => {
    const { value } = useContext(EnvironmentVariableContext);
    const { showValues } = useContext(EnvironmentVariablesContext);
    const displayValue = showValues
        ? value
        : "•".repeat(Math.min(value.length, 20));
    return (_jsx("span", { className: cn("font-mono text-muted-foreground text-sm", !showValues && "select-none", className), ...props, children: children ?? displayValue }));
};
export const EnvironmentVariable = ({ name, value, className, children, ...props }) => {
    const envVarContextValue = useMemo(() => ({ name, value }), [name, value]);
    return (_jsx(EnvironmentVariableContext.Provider, { value: envVarContextValue, children: _jsx("div", { className: cn("flex items-center justify-between gap-4 px-4 py-3", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx(EnvironmentVariableName, {}) }), _jsx(EnvironmentVariableValue, {})] })) }) }));
};
export const EnvironmentVariableCopyButton = ({ onCopy, onError, timeout = 2000, copyFormat = "value", children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const { name, value } = useContext(EnvironmentVariableContext);
    const getTextToCopy = useCallback(() => {
        const formatMap = {
            export: () => `export ${name}="${value}"`,
            name: () => name,
            value: () => value,
        };
        return formatMap[copyFormat]();
    }, [name, value, copyFormat]);
    const copyToClipboard = useCallback(async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }
        try {
            await navigator.clipboard.writeText(getTextToCopy());
            setIsCopied(true);
            onCopy?.();
            timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
        }
        catch (error) {
            onError?.(error);
        }
    }, [getTextToCopy, onCopy, onError, timeout]);
    useEffect(() => () => {
        window.clearTimeout(timeoutRef.current);
    }, []);
    const Icon = isCopied ? CheckIcon : CopyIcon;
    return (_jsx(Button, { className: cn("size-6 shrink-0", className), onClick: copyToClipboard, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Icon, { size: 12 }) }));
};
export const EnvironmentVariableRequired = ({ className, children, ...props }) => (_jsx(Badge, { className: cn("text-xs", className), variant: "secondary", ...props, children: children ?? "Required" }));
//# sourceMappingURL=environment-variables.js.map