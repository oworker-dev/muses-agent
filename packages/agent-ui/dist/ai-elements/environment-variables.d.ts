import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Switch } from "../ui/switch.js";
import type { ComponentProps, HTMLAttributes } from "react";
export type EnvironmentVariablesProps = HTMLAttributes<HTMLDivElement> & {
    showValues?: boolean;
    defaultShowValues?: boolean;
    onShowValuesChange?: (show: boolean) => void;
};
export declare const EnvironmentVariables: ({ showValues: controlledShowValues, defaultShowValues, onShowValuesChange, className, children, ...props }: EnvironmentVariablesProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariablesHeaderProps = HTMLAttributes<HTMLDivElement>;
export declare const EnvironmentVariablesHeader: ({ className, children, ...props }: EnvironmentVariablesHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariablesTitleProps = HTMLAttributes<HTMLHeadingElement>;
export declare const EnvironmentVariablesTitle: ({ className, children, ...props }: EnvironmentVariablesTitleProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariablesToggleProps = ComponentProps<typeof Switch>;
export declare const EnvironmentVariablesToggle: ({ className, ...props }: EnvironmentVariablesToggleProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariablesContentProps = HTMLAttributes<HTMLDivElement>;
export declare const EnvironmentVariablesContent: ({ className, children, ...props }: EnvironmentVariablesContentProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableGroupProps = HTMLAttributes<HTMLDivElement>;
export declare const EnvironmentVariableGroup: ({ className, children, ...props }: EnvironmentVariableGroupProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableNameProps = HTMLAttributes<HTMLSpanElement>;
export declare const EnvironmentVariableName: ({ className, children, ...props }: EnvironmentVariableNameProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableValueProps = HTMLAttributes<HTMLSpanElement>;
export declare const EnvironmentVariableValue: ({ className, children, ...props }: EnvironmentVariableValueProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableProps = HTMLAttributes<HTMLDivElement> & {
    name: string;
    value: string;
};
export declare const EnvironmentVariable: ({ name, value, className, children, ...props }: EnvironmentVariableProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
    copyFormat?: "name" | "value" | "export";
};
export declare const EnvironmentVariableCopyButton: ({ onCopy, onError, timeout, copyFormat, children, className, ...props }: EnvironmentVariableCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
export type EnvironmentVariableRequiredProps = ComponentProps<typeof Badge>;
export declare const EnvironmentVariableRequired: ({ className, children, ...props }: EnvironmentVariableRequiredProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=environment-variables.d.ts.map