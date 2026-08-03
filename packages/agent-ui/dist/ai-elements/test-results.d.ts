import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import type { ComponentProps, HTMLAttributes } from "react";
type TestStatus = "passed" | "failed" | "skipped" | "running";
interface TestResultsSummary {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration?: number;
}
export type TestResultsHeaderProps = HTMLAttributes<HTMLDivElement>;
export declare const TestResultsHeader: ({ className, children, ...props }: TestResultsHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type TestResultsDurationProps = HTMLAttributes<HTMLSpanElement>;
export declare const TestResultsDuration: ({ className, children, ...props }: TestResultsDurationProps) => import("react/jsx-runtime").JSX.Element | null;
export type TestResultsSummaryProps = HTMLAttributes<HTMLDivElement>;
export declare const TestResultsSummary: ({ className, children, ...props }: TestResultsSummaryProps) => import("react/jsx-runtime").JSX.Element | null;
export type TestResultsProps = HTMLAttributes<HTMLDivElement> & {
    summary?: TestResultsSummary;
};
export declare const TestResults: ({ summary, className, children, ...props }: TestResultsProps) => import("react/jsx-runtime").JSX.Element;
export type TestResultsProgressProps = HTMLAttributes<HTMLDivElement>;
export declare const TestResultsProgress: ({ className, children, ...props }: TestResultsProgressProps) => import("react/jsx-runtime").JSX.Element | null;
export type TestResultsContentProps = HTMLAttributes<HTMLDivElement>;
export declare const TestResultsContent: ({ className, children, ...props }: TestResultsContentProps) => import("react/jsx-runtime").JSX.Element;
export type TestSuiteProps = ComponentProps<typeof Collapsible> & {
    name: string;
    status: TestStatus;
};
export declare const TestSuite: ({ name, status, className, children, ...props }: TestSuiteProps) => import("react/jsx-runtime").JSX.Element;
export type TestSuiteNameProps = ComponentProps<typeof CollapsibleTrigger>;
export declare const TestSuiteName: ({ className, children, ...props }: TestSuiteNameProps) => import("react/jsx-runtime").JSX.Element;
export type TestSuiteStatsProps = HTMLAttributes<HTMLDivElement> & {
    passed?: number;
    failed?: number;
    skipped?: number;
};
export declare const TestSuiteStats: ({ passed, failed, skipped, className, children, ...props }: TestSuiteStatsProps) => import("react/jsx-runtime").JSX.Element;
export type TestSuiteContentProps = ComponentProps<typeof CollapsibleContent>;
export declare const TestSuiteContent: ({ className, children, ...props }: TestSuiteContentProps) => import("react/jsx-runtime").JSX.Element;
export type TestNameProps = HTMLAttributes<HTMLSpanElement>;
export declare const TestName: ({ className, children, ...props }: TestNameProps) => import("react/jsx-runtime").JSX.Element;
export type TestDurationProps = HTMLAttributes<HTMLSpanElement>;
export declare const TestDuration: ({ className, children, ...props }: TestDurationProps) => import("react/jsx-runtime").JSX.Element | null;
export type TestStatusProps = HTMLAttributes<HTMLSpanElement>;
export declare const TestStatus: ({ className, children, ...props }: TestStatusProps) => import("react/jsx-runtime").JSX.Element;
export type TestProps = HTMLAttributes<HTMLDivElement> & {
    name: string;
    status: TestStatus;
    duration?: number;
};
export declare const Test: ({ name, status, duration, className, children, ...props }: TestProps) => import("react/jsx-runtime").JSX.Element;
export type TestErrorProps = HTMLAttributes<HTMLDivElement>;
export declare const TestError: ({ className, children, ...props }: TestErrorProps) => import("react/jsx-runtime").JSX.Element;
export type TestErrorMessageProps = HTMLAttributes<HTMLParagraphElement>;
export declare const TestErrorMessage: ({ className, children, ...props }: TestErrorMessageProps) => import("react/jsx-runtime").JSX.Element;
export type TestErrorStackProps = HTMLAttributes<HTMLPreElement>;
export declare const TestErrorStack: ({ className, children, ...props }: TestErrorStackProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=test-results.d.ts.map