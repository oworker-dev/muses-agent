"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge } from "../ui/badge.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { ChevronRightIcon } from "lucide-react";
import { createContext, useContext, useMemo } from "react";
const SchemaDisplayContext = createContext({
    method: "GET",
    path: "",
});
const methodStyles = {
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    GET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    PATCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};
export const SchemaDisplayHeader = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center gap-3 border-b px-4 py-3", className), ...props, children: children }));
export const SchemaDisplayMethod = ({ className, children, ...props }) => {
    const { method } = useContext(SchemaDisplayContext);
    return (_jsx(Badge, { className: cn("font-mono text-xs", methodStyles[method], className), variant: "secondary", ...props, children: children ?? method }));
};
export const SchemaDisplayPath = ({ className, children, ...props }) => {
    const { path } = useContext(SchemaDisplayContext);
    const highlightedPath = path.replaceAll(/\{([^}]+)\}/g, '<span class="text-blue-600 dark:text-blue-400">{$1}</span>');
    return (_jsx("span", { className: cn("font-mono text-sm", className), dangerouslySetInnerHTML: { __html: children ?? highlightedPath }, ...props }));
};
export const SchemaDisplayDescription = ({ className, children, ...props }) => {
    const { description } = useContext(SchemaDisplayContext);
    return (_jsx("p", { className: cn("border-b px-4 py-3 text-muted-foreground text-sm", className), ...props, children: children ?? description }));
};
export const SchemaDisplayContent = ({ className, children, ...props }) => (_jsx("div", { className: cn("divide-y", className), ...props, children: children }));
export const SchemaDisplayParameter = ({ name, type, required, description, location, className, ...props }) => (_jsxs("div", { className: cn("px-4 py-3 pl-10", className), ...props, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-sm", children: name }), _jsx(Badge, { className: "text-xs", variant: "outline", children: type }), location && (_jsx(Badge, { className: "text-xs", variant: "secondary", children: location })), required && (_jsx(Badge, { className: "bg-red-100 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400", variant: "secondary", children: "required" }))] }), description && (_jsx("p", { className: "mt-1 text-muted-foreground text-sm", children: description }))] }));
export const SchemaDisplayParameters = ({ className, children, ...props }) => {
    const { parameters } = useContext(SchemaDisplayContext);
    return (_jsxs(Collapsible, { className: cn(className), defaultOpen: true, ...props, children: [_jsxs(CollapsibleTrigger, { className: "group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50", children: [_jsx(ChevronRightIcon, { className: "size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }), _jsx("span", { className: "font-medium text-sm", children: "Parameters" }), _jsx(Badge, { className: "ml-auto text-xs", variant: "secondary", children: parameters?.length })] }), _jsx(CollapsibleContent, { children: _jsx("div", { className: "divide-y border-t", children: children ??
                        parameters?.map((param) => (_jsx(SchemaDisplayParameter, { ...param }, param.name))) }) })] }));
};
export const SchemaDisplayProperty = ({ name, type, required, description, properties, items, depth = 0, className, ...props }) => {
    const hasChildren = properties || items;
    const paddingLeft = 40 + depth * 16;
    if (hasChildren) {
        return (_jsxs(Collapsible, { defaultOpen: depth < 2, children: [_jsxs(CollapsibleTrigger, { className: cn("group flex w-full items-center gap-2 py-3 text-left transition-colors hover:bg-muted/50", className), style: { paddingLeft }, children: [_jsx(ChevronRightIcon, { className: "size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }), _jsx("span", { className: "font-mono text-sm", children: name }), _jsx(Badge, { className: "text-xs", variant: "outline", children: type }), required && (_jsx(Badge, { className: "bg-red-100 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400", variant: "secondary", children: "required" }))] }), description && (_jsx("p", { className: "pb-2 text-muted-foreground text-sm", style: { paddingLeft: paddingLeft + 24 }, children: description })), _jsx(CollapsibleContent, { children: _jsxs("div", { className: "divide-y border-t", children: [properties?.map((prop) => (_jsx(SchemaDisplayProperty, { ...prop, depth: depth + 1 }, prop.name))), items && (_jsx(SchemaDisplayProperty, { ...items, depth: depth + 1, name: `${name}[]` }))] }) })] }));
    }
    return (_jsxs("div", { className: cn("py-3 pr-4", className), style: { paddingLeft }, ...props, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "size-4" }), _jsx("span", { className: "font-mono text-sm", children: name }), _jsx(Badge, { className: "text-xs", variant: "outline", children: type }), required && (_jsx(Badge, { className: "bg-red-100 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400", variant: "secondary", children: "required" }))] }), description && (_jsx("p", { className: "mt-1 pl-6 text-muted-foreground text-sm", children: description }))] }));
};
export const SchemaDisplayRequest = ({ className, children, ...props }) => {
    const { requestBody } = useContext(SchemaDisplayContext);
    return (_jsxs(Collapsible, { className: cn(className), defaultOpen: true, ...props, children: [_jsxs(CollapsibleTrigger, { className: "group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50", children: [_jsx(ChevronRightIcon, { className: "size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }), _jsx("span", { className: "font-medium text-sm", children: "Request Body" })] }), _jsx(CollapsibleContent, { children: _jsx("div", { className: "border-t", children: children ??
                        requestBody?.map((prop) => (_jsx(SchemaDisplayProperty, { ...prop, depth: 0 }, prop.name))) }) })] }));
};
export const SchemaDisplayResponse = ({ className, children, ...props }) => {
    const { responseBody } = useContext(SchemaDisplayContext);
    return (_jsxs(Collapsible, { className: cn(className), defaultOpen: true, ...props, children: [_jsxs(CollapsibleTrigger, { className: "group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50", children: [_jsx(ChevronRightIcon, { className: "size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }), _jsx("span", { className: "font-medium text-sm", children: "Response" })] }), _jsx(CollapsibleContent, { children: _jsx("div", { className: "border-t", children: children ??
                        responseBody?.map((prop) => (_jsx(SchemaDisplayProperty, { ...prop, depth: 0 }, prop.name))) }) })] }));
};
export const SchemaDisplay = ({ method, path, description, parameters, requestBody, responseBody, className, children, ...props }) => {
    const contextValue = useMemo(() => ({
        description,
        method,
        parameters,
        path,
        requestBody,
        responseBody,
    }), [description, method, parameters, path, requestBody, responseBody]);
    return (_jsx(SchemaDisplayContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("overflow-hidden rounded-lg border bg-background", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(SchemaDisplayHeader, { children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(SchemaDisplayMethod, {}), _jsx(SchemaDisplayPath, {})] }) }), description && _jsx(SchemaDisplayDescription, {}), _jsxs(SchemaDisplayContent, { children: [parameters && parameters.length > 0 && (_jsx(SchemaDisplayParameters, {})), requestBody && requestBody.length > 0 && (_jsx(SchemaDisplayRequest, {})), responseBody && responseBody.length > 0 && (_jsx(SchemaDisplayResponse, {}))] })] })) }) }));
};
export const SchemaDisplayBody = ({ className, children, ...props }) => (_jsx("div", { className: cn("divide-y", className), ...props, children: children }));
export const SchemaDisplayExample = ({ className, children, ...props }) => (_jsx("pre", { className: cn("mx-4 mb-4 overflow-auto rounded-md bg-muted p-4 font-mono text-sm", className), ...props, children: children }));
//# sourceMappingURL=schema-display.js.map