"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge } from "../ui/badge.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../ui/collapsible.js";
import { cn } from "../utils.js";
import { CheckCircle2Icon, ChevronRightIcon, CircleDotIcon, CircleIcon, XCircleIcon, } from "lucide-react";
import { createContext, useContext, useMemo } from "react";
const TestResultsContext = createContext({});
const formatDuration = (ms) => {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
};
export const TestResultsHeader = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between border-b px-4 py-3", className), ...props, children: children }));
export const TestResultsDuration = ({ className, children, ...props }) => {
    const { summary } = useContext(TestResultsContext);
    if (!summary?.duration) {
        return null;
    }
    return (_jsx("span", { className: cn("text-muted-foreground text-sm", className), ...props, children: children ?? formatDuration(summary.duration) }));
};
export const TestResultsSummary = ({ className, children, ...props }) => {
    const { summary } = useContext(TestResultsContext);
    if (!summary) {
        return null;
    }
    return (_jsx("div", { className: cn("flex items-center gap-3", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsxs(Badge, { className: "gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", variant: "secondary", children: [_jsx(CheckCircle2Icon, { className: "size-3" }), summary.passed, " passed"] }), summary.failed > 0 && (_jsxs(Badge, { className: "gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", variant: "secondary", children: [_jsx(XCircleIcon, { className: "size-3" }), summary.failed, " failed"] })), summary.skipped > 0 && (_jsxs(Badge, { className: "gap-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", variant: "secondary", children: [_jsx(CircleIcon, { className: "size-3" }), summary.skipped, " skipped"] }))] })) }));
};
export const TestResults = ({ summary, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ summary }), [summary]);
    return (_jsx(TestResultsContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("rounded-lg border bg-background", className), ...props, children: children ??
                (summary && (_jsxs(TestResultsHeader, { children: [_jsx(TestResultsSummary, {}), _jsx(TestResultsDuration, {})] }))) }) }));
};
export const TestResultsProgress = ({ className, children, ...props }) => {
    const { summary } = useContext(TestResultsContext);
    if (!summary) {
        return null;
    }
    const passedPercent = (summary.passed / summary.total) * 100;
    const failedPercent = (summary.failed / summary.total) * 100;
    return (_jsx("div", { className: cn("space-y-2", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex h-2 overflow-hidden rounded-full bg-muted", children: [_jsx("div", { className: "bg-green-500 transition-all", style: { width: `${passedPercent}%` } }), _jsx("div", { className: "bg-red-500 transition-all", style: { width: `${failedPercent}%` } })] }), _jsxs("div", { className: "flex justify-between text-muted-foreground text-xs", children: [_jsxs("span", { children: [summary.passed, "/", summary.total, " tests passed"] }), _jsxs("span", { children: [passedPercent.toFixed(0), "%"] })] })] })) }));
};
export const TestResultsContent = ({ className, children, ...props }) => (_jsx("div", { className: cn("space-y-2 p-4", className), ...props, children: children }));
const TestSuiteContext = createContext({
    name: "",
    status: "passed",
});
const statusStyles = {
    failed: "text-red-600 dark:text-red-400",
    passed: "text-green-600 dark:text-green-400",
    running: "text-blue-600 dark:text-blue-400",
    skipped: "text-yellow-600 dark:text-yellow-400",
};
const statusIcons = {
    failed: _jsx(XCircleIcon, { className: "size-4" }),
    passed: _jsx(CheckCircle2Icon, { className: "size-4" }),
    running: _jsx(CircleDotIcon, { className: "size-4 animate-pulse" }),
    skipped: _jsx(CircleIcon, { className: "size-4" }),
};
const TestStatusIcon = ({ status }) => (_jsx("span", { className: cn("shrink-0", statusStyles[status]), children: statusIcons[status] }));
export const TestSuite = ({ name, status, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ name, status }), [name, status]);
    return (_jsx(TestSuiteContext.Provider, { value: contextValue, children: _jsx(Collapsible, { className: cn("rounded-lg border", className), ...props, children: children }) }));
};
export const TestSuiteName = ({ className, children, ...props }) => {
    const { name, status } = useContext(TestSuiteContext);
    return (_jsxs(CollapsibleTrigger, { className: cn("group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50", className), ...props, children: [_jsx(ChevronRightIcon, { className: "size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }), _jsx(TestStatusIcon, { status: status }), _jsx("span", { className: "font-medium text-sm", children: children ?? name })] }));
};
export const TestSuiteStats = ({ passed = 0, failed = 0, skipped = 0, className, children, ...props }) => (_jsx("div", { className: cn("ml-auto flex items-center gap-2 text-xs", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [passed > 0 && (_jsxs("span", { className: "text-green-600 dark:text-green-400", children: [passed, " passed"] })), failed > 0 && (_jsxs("span", { className: "text-red-600 dark:text-red-400", children: [failed, " failed"] })), skipped > 0 && (_jsxs("span", { className: "text-yellow-600 dark:text-yellow-400", children: [skipped, " skipped"] }))] })) }));
export const TestSuiteContent = ({ className, children, ...props }) => (_jsx(CollapsibleContent, { className: cn("border-t", className), ...props, children: _jsx("div", { className: "divide-y", children: children }) }));
const TestContext = createContext({
    name: "",
    status: "passed",
});
export const TestName = ({ className, children, ...props }) => {
    const { name } = useContext(TestContext);
    return (_jsx("span", { className: cn("flex-1", className), ...props, children: children ?? name }));
};
export const TestDuration = ({ className, children, ...props }) => {
    const { duration } = useContext(TestContext);
    if (duration === undefined) {
        return null;
    }
    return (_jsx("span", { className: cn("ml-auto text-muted-foreground text-xs", className), ...props, children: children ?? `${duration}ms` }));
};
export const TestStatus = ({ className, children, ...props }) => {
    const { status } = useContext(TestContext);
    return (_jsx("span", { className: cn("shrink-0", statusStyles[status], className), ...props, children: children ?? statusIcons[status] }));
};
export const Test = ({ name, status, duration, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ duration, name, status }), [duration, name, status]);
    return (_jsx(TestContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("flex items-center gap-2 px-4 py-2 text-sm", className), ...props, children: children ?? (_jsxs(_Fragment, { children: [_jsx(TestStatus, {}), _jsx(TestName, {}), duration !== undefined && _jsx(TestDuration, {})] })) }) }));
};
export const TestError = ({ className, children, ...props }) => (_jsx("div", { className: cn("mt-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20", className), ...props, children: children }));
export const TestErrorMessage = ({ className, children, ...props }) => (_jsx("p", { className: cn("font-medium text-red-700 text-sm dark:text-red-400", className), ...props, children: children }));
export const TestErrorStack = ({ className, children, ...props }) => (_jsx("pre", { className: cn("mt-2 overflow-auto font-mono text-red-600 text-xs dark:text-red-400", className), ...props, children: children }));
//# sourceMappingURL=test-results.js.map