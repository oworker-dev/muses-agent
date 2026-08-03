"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon, } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, } from "react";
const noop = () => { };
const FileTreeContext = createContext({
    expandedPaths: new Set(),
    togglePath: noop,
});
export const FileTree = ({ expanded: controlledExpanded, defaultExpanded = new Set(), selectedPath, onSelect, onExpandedChange, className, children, ...props }) => {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const expandedPaths = controlledExpanded ?? internalExpanded;
    const togglePath = useCallback((path) => {
        const newExpanded = new Set(expandedPaths);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        }
        else {
            newExpanded.add(path);
        }
        setInternalExpanded(newExpanded);
        onExpandedChange?.(newExpanded);
    }, [expandedPaths, onExpandedChange]);
    const contextValue = useMemo(() => ({ expandedPaths, onSelect, selectedPath, togglePath }), [expandedPaths, onSelect, selectedPath, togglePath]);
    return (_jsx(FileTreeContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("rounded-lg border bg-background font-mono text-sm", className), role: "tree", ...props, children: _jsx("div", { className: "p-2", children: children }) }) }));
};
export const FileTreeIcon = ({ className, children, ...props }) => (_jsx("span", { className: cn("shrink-0", className), ...props, children: children }));
export const FileTreeName = ({ className, children, ...props }) => (_jsx("span", { className: cn("truncate", className), ...props, children: children }));
const FileTreeFolderContext = createContext({
    isExpanded: false,
    name: "",
    path: "",
});
export const FileTreeFolder = ({ path, name, className, children, ...props }) => {
    const { expandedPaths, togglePath, selectedPath, onSelect } = useContext(FileTreeContext);
    const isExpanded = expandedPaths.has(path);
    const isSelected = selectedPath === path;
    const handleOpenChange = useCallback(() => {
        togglePath(path);
    }, [togglePath, path]);
    const handleSelect = useCallback(() => {
        onSelect?.(path);
    }, [onSelect, path]);
    const folderContextValue = useMemo(() => ({ isExpanded, name, path }), [isExpanded, name, path]);
    return (_jsx(FileTreeFolderContext.Provider, { value: folderContextValue, children: _jsx(Collapsible, { onOpenChange: handleOpenChange, open: isExpanded, children: _jsxs("div", { className: cn("", className), role: "treeitem", tabIndex: 0, ...props, children: [_jsxs("div", { className: cn("flex w-full items-center gap-1 rounded px-2 py-1 text-left transition-colors hover:bg-muted/50", isSelected && "bg-muted"), children: [_jsx(CollapsibleTrigger, { asChild: true, children: _jsx("button", { className: "flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0", type: "button", children: _jsx(ChevronRightIcon, { className: cn("size-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90") }) }) }), _jsxs("button", { className: "flex min-w-0 flex-1 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left", onClick: handleSelect, type: "button", children: [_jsx(FileTreeIcon, { children: isExpanded ? (_jsx(FolderOpenIcon, { className: "size-4 text-blue-500" })) : (_jsx(FolderIcon, { className: "size-4 text-blue-500" })) }), _jsx(FileTreeName, { children: name })] })] }), _jsx(CollapsibleContent, { children: _jsx("div", { className: "ml-4 border-l pl-2", children: children }) })] }) }) }));
};
const FileTreeFileContext = createContext({
    name: "",
    path: "",
});
export const FileTreeFile = ({ path, name, icon, className, children, ...props }) => {
    const { selectedPath, onSelect } = useContext(FileTreeContext);
    const isSelected = selectedPath === path;
    const handleClick = useCallback(() => {
        onSelect?.(path);
    }, [onSelect, path]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            onSelect?.(path);
        }
    }, [onSelect, path]);
    const fileContextValue = useMemo(() => ({ name, path }), [name, path]);
    return (_jsx(FileTreeFileContext.Provider, { value: fileContextValue, children: _jsx("div", { className: cn("flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted/50", isSelected && "bg-muted", className), onClick: handleClick, onKeyDown: handleKeyDown, role: "treeitem", tabIndex: 0, ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx("span", { className: "size-4 shrink-0" }), _jsx(FileTreeIcon, { children: icon ?? _jsx(FileIcon, { className: "size-4 text-muted-foreground" }) }), _jsx(FileTreeName, { children: name })] })) }) }));
};
const stopPropagation = (e) => e.stopPropagation();
export const FileTreeActions = ({ className, children, ...props }) => (_jsx("div", { className: cn("ml-auto flex items-center gap-1", className), onClick: stopPropagation, onKeyDown: stopPropagation, role: "group", ...props, children: children }));
//# sourceMappingURL=file-tree.js.map