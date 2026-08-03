import type { ComponentProps, ReactNode } from "react";
import type { TProps as JsxParserProps } from "react-jsx-parser";
interface JSXPreviewContextValue {
    jsx: string;
    processedJsx: string;
    isStreaming: boolean;
    error: Error | null;
    setError: (error: Error | null) => void;
    setLastGoodJsx: (jsx: string) => void;
    components: JsxParserProps["components"];
    bindings: JsxParserProps["bindings"];
    onErrorProp?: (error: Error) => void;
}
export declare const useJSXPreview: () => JSXPreviewContextValue;
export type JSXPreviewProps = ComponentProps<"div"> & {
    jsx: string;
    isStreaming?: boolean;
    components?: JsxParserProps["components"];
    bindings?: JsxParserProps["bindings"];
    onError?: (error: Error) => void;
};
export declare const JSXPreview: import("react").MemoExoticComponent<({ jsx, isStreaming, components, bindings, onError, className, children, ...props }: JSXPreviewProps) => import("react/jsx-runtime").JSX.Element>;
export type JSXPreviewContentProps = Omit<ComponentProps<"div">, "children">;
export declare const JSXPreviewContent: import("react").MemoExoticComponent<({ className, ...props }: JSXPreviewContentProps) => import("react/jsx-runtime").JSX.Element>;
export type JSXPreviewErrorProps = ComponentProps<"div"> & {
    children?: ReactNode | ((error: Error) => ReactNode);
};
export declare const JSXPreviewError: import("react").MemoExoticComponent<({ className, children, ...props }: JSXPreviewErrorProps) => import("react/jsx-runtime").JSX.Element | null>;
export {};
//# sourceMappingURL=jsx-preview.d.ts.map