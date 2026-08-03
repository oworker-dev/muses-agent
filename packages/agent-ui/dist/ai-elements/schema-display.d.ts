import { Badge } from "../ui/badge.js";
import { Collapsible } from "../ui/collapsible.js";
import type { ComponentProps, HTMLAttributes } from "react";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
interface SchemaParameter {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    location?: "path" | "query" | "header";
}
interface SchemaProperty {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    properties?: SchemaProperty[];
    items?: SchemaProperty;
}
export type SchemaDisplayHeaderProps = HTMLAttributes<HTMLDivElement>;
export declare const SchemaDisplayHeader: ({ className, children, ...props }: SchemaDisplayHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayMethodProps = ComponentProps<typeof Badge>;
export declare const SchemaDisplayMethod: ({ className, children, ...props }: SchemaDisplayMethodProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayPathProps = HTMLAttributes<HTMLSpanElement>;
export declare const SchemaDisplayPath: ({ className, children, ...props }: SchemaDisplayPathProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export declare const SchemaDisplayDescription: ({ className, children, ...props }: SchemaDisplayDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayContentProps = HTMLAttributes<HTMLDivElement>;
export declare const SchemaDisplayContent: ({ className, children, ...props }: SchemaDisplayContentProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayParameterProps = HTMLAttributes<HTMLDivElement> & SchemaParameter;
export declare const SchemaDisplayParameter: ({ name, type, required, description, location, className, ...props }: SchemaDisplayParameterProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayParametersProps = ComponentProps<typeof Collapsible>;
export declare const SchemaDisplayParameters: ({ className, children, ...props }: SchemaDisplayParametersProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayPropertyProps = HTMLAttributes<HTMLDivElement> & SchemaProperty & {
    depth?: number;
};
export declare const SchemaDisplayProperty: ({ name, type, required, description, properties, items, depth, className, ...props }: SchemaDisplayPropertyProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayRequestProps = ComponentProps<typeof Collapsible>;
export declare const SchemaDisplayRequest: ({ className, children, ...props }: SchemaDisplayRequestProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayResponseProps = ComponentProps<typeof Collapsible>;
export declare const SchemaDisplayResponse: ({ className, children, ...props }: SchemaDisplayResponseProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayProps = HTMLAttributes<HTMLDivElement> & {
    method: HttpMethod;
    path: string;
    description?: string;
    parameters?: SchemaParameter[];
    requestBody?: SchemaProperty[];
    responseBody?: SchemaProperty[];
};
export declare const SchemaDisplay: ({ method, path, description, parameters, requestBody, responseBody, className, children, ...props }: SchemaDisplayProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayBodyProps = HTMLAttributes<HTMLDivElement>;
export declare const SchemaDisplayBody: ({ className, children, ...props }: SchemaDisplayBodyProps) => import("react/jsx-runtime").JSX.Element;
export type SchemaDisplayExampleProps = HTMLAttributes<HTMLPreElement>;
export declare const SchemaDisplayExample: ({ className, children, ...props }: SchemaDisplayExampleProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=schema-display.d.ts.map