"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge } from "../ui/badge.js";
import { cn } from "../utils.js";
import { ArrowRightIcon, MinusIcon, PackageIcon, PlusIcon } from "lucide-react";
import { createContext, useContext, useMemo } from "react";
const PackageInfoContext = createContext({
    name: "",
});
export const PackageInfoHeader = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between gap-2", className), ...props, children: children }));
export const PackageInfoName = ({ className, children, ...props }) => {
    const { name } = useContext(PackageInfoContext);
    return (_jsxs("div", { className: cn("flex items-center gap-2", className), ...props, children: [_jsx(PackageIcon, { className: "size-4 text-muted-foreground" }), _jsx("span", { className: "font-medium font-mono text-sm", children: children ?? name })] }));
};
const changeTypeStyles = {
    added: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    major: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    minor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    patch: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    removed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};
const changeTypeIcons = {
    added: _jsx(PlusIcon, { className: "size-3" }),
    major: _jsx(ArrowRightIcon, { className: "size-3" }),
    minor: _jsx(ArrowRightIcon, { className: "size-3" }),
    patch: _jsx(ArrowRightIcon, { className: "size-3" }),
    removed: _jsx(MinusIcon, { className: "size-3" }),
};
export const PackageInfoChangeType = ({ className, children, ...props }) => {
    const { changeType } = useContext(PackageInfoContext);
    if (!changeType) {
        return null;
    }
    return (_jsxs(Badge, { className: cn("gap-1 text-xs capitalize", changeTypeStyles[changeType], className), variant: "secondary", ...props, children: [changeTypeIcons[changeType], children ?? changeType] }));
};
export const PackageInfoVersion = ({ className, children, ...props }) => {
    const { currentVersion, newVersion } = useContext(PackageInfoContext);
    if (!(currentVersion || newVersion)) {
        return null;
    }
    return (_jsx("div", { className: cn("mt-2 flex items-center gap-2 font-mono text-muted-foreground text-sm", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [currentVersion && _jsx("span", { children: currentVersion }), currentVersion && newVersion && (_jsx(ArrowRightIcon, { className: "size-3" })), newVersion && (_jsx("span", { className: "font-medium text-foreground", children: newVersion }))] })) }));
};
export const PackageInfo = ({ name, currentVersion, newVersion, changeType, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ changeType, currentVersion, name, newVersion }), [changeType, currentVersion, name, newVersion]);
    return (_jsx(PackageInfoContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("rounded-lg border bg-background p-4", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsxs(PackageInfoHeader, { children: [_jsx(PackageInfoName, {}), changeType && _jsx(PackageInfoChangeType, {})] }), (currentVersion || newVersion) && _jsx(PackageInfoVersion, {})] })) }) }));
};
export const PackageInfoDescription = ({ className, children, ...props }) => (_jsx("p", { className: cn("mt-2 text-muted-foreground text-sm", className), ...props, children: children }));
export const PackageInfoContent = ({ className, children, ...props }) => (_jsx("div", { className: cn("mt-3 border-t pt-3", className), ...props, children: children }));
export const PackageInfoDependencies = ({ className, children, ...props }) => (_jsxs("div", { className: cn("space-y-2", className), ...props, children: [_jsx("span", { className: "font-medium text-muted-foreground text-xs uppercase tracking-wide", children: "Dependencies" }), _jsx("div", { className: "space-y-1", children: children })] }));
export const PackageInfoDependency = ({ name, version, className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between text-sm", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-mono text-muted-foreground", children: name }), version && _jsx("span", { className: "font-mono text-xs", children: version })] })) }));
//# sourceMappingURL=package-info.js.map