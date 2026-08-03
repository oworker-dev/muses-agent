"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../utils.js";
import { AlertCircle } from "lucide-react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import JsxParser from "react-jsx-parser";
const JSXPreviewContext = createContext(null);
const TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*?)(\/)?>/;
export const useJSXPreview = () => {
    const context = useContext(JSXPreviewContext);
    if (!context) {
        throw new Error("JSXPreview components must be used within JSXPreview");
    }
    return context;
};
const matchJsxTag = (code) => {
    if (code.trim() === "") {
        return null;
    }
    const match = code.match(TAG_REGEX);
    if (!match || match.index === undefined) {
        return null;
    }
    const [fullMatch, tagName, attributes, selfClosing] = match;
    let type;
    if (selfClosing) {
        type = "self-closing";
    }
    else if (fullMatch.startsWith("</")) {
        type = "closing";
    }
    else {
        type = "opening";
    }
    return {
        attributes: attributes.trim(),
        endIndex: match.index + fullMatch.length,
        startIndex: match.index,
        tag: fullMatch,
        tagName,
        type,
    };
};
const stripIncompleteTag = (text) => {
    const lastOpen = text.lastIndexOf("<");
    if (lastOpen === -1) {
        return text;
    }
    const afterOpen = text.slice(lastOpen);
    if (!afterOpen.includes(">")) {
        return text.slice(0, lastOpen);
    }
    return text;
};
const completeJsxTag = (code) => {
    const stack = [];
    let result = "";
    let currentPosition = 0;
    while (currentPosition < code.length) {
        const match = matchJsxTag(code.slice(currentPosition));
        if (!match) {
            result += stripIncompleteTag(code.slice(currentPosition));
            break;
        }
        const { tagName, type, endIndex } = match;
        result += code.slice(currentPosition, currentPosition + endIndex);
        if (type === "opening") {
            stack.push(tagName);
        }
        else if (type === "closing") {
            stack.pop();
        }
        currentPosition += endIndex;
    }
    return (result +
        stack
            .toReversed()
            .map((tag) => `</${tag}>`)
            .join(""));
};
export const JSXPreview = memo(({ jsx, isStreaming = false, components, bindings, onError, className, children, ...props }) => {
    const [prevJsx, setPrevJsx] = useState(jsx);
    const [error, setError] = useState(null);
    const [_lastGoodJsx, setLastGoodJsx] = useState("");
    if (jsx !== prevJsx) {
        setPrevJsx(jsx);
        setError(null);
    }
    const processedJsx = useMemo(() => (isStreaming ? completeJsxTag(jsx) : jsx), [jsx, isStreaming]);
    const contextValue = useMemo(() => ({
        bindings,
        components,
        error,
        isStreaming,
        jsx,
        onErrorProp: onError,
        processedJsx,
        setError,
        setLastGoodJsx,
    }), [
        bindings,
        components,
        error,
        isStreaming,
        jsx,
        onError,
        processedJsx,
        setError,
    ]);
    return (_jsx(JSXPreviewContext.Provider, { value: contextValue, children: _jsx("div", { className: cn("relative", className), ...props, children: children }) }));
});
JSXPreview.displayName = "JSXPreview";
export const JSXPreviewContent = memo(({ className, ...props }) => {
    const { processedJsx, isStreaming, components, bindings, setError, setLastGoodJsx, onErrorProp, } = useJSXPreview();
    const errorReportedRef = useRef(null);
    const lastGoodJsxRef = useRef("");
    const [hadError, setHadError] = useState(false);
    useEffect(() => {
        errorReportedRef.current = null;
        setHadError(false);
    }, [processedJsx]);
    const handleError = useCallback((err) => {
        if (errorReportedRef.current === processedJsx) {
            return;
        }
        errorReportedRef.current = processedJsx;
        if (isStreaming) {
            setHadError(true);
            return;
        }
        setError(err);
        onErrorProp?.(err);
    }, [processedJsx, isStreaming, onErrorProp, setError]);
    useEffect(() => {
        if (!errorReportedRef.current) {
            lastGoodJsxRef.current = processedJsx;
            setLastGoodJsx(processedJsx);
        }
    }, [processedJsx, setLastGoodJsx]);
    const displayJsx = isStreaming && hadError ? lastGoodJsxRef.current : processedJsx;
    return (_jsx("div", { className: cn("jsx-preview-content", className), ...props, children: _jsx(JsxParser, { bindings: bindings, components: components, jsx: displayJsx, onError: handleError, renderInWrapper: false }) }));
});
JSXPreviewContent.displayName = "JSXPreviewContent";
const renderChildren = (children, error) => {
    if (typeof children === "function") {
        return children(error);
    }
    return children;
};
export const JSXPreviewError = memo(({ className, children, ...props }) => {
    const { error } = useJSXPreview();
    if (!error) {
        return null;
    }
    return (_jsx("div", { className: cn("flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm", className), ...props, children: children ? (renderChildren(children, error)) : (_jsxs(_Fragment, { children: [_jsx(AlertCircle, { className: "size-4 shrink-0" }), _jsx("span", { children: error.message })] })) }));
});
JSXPreviewError.displayName = "JSXPreviewError";
//# sourceMappingURL=jsx-preview.js.map