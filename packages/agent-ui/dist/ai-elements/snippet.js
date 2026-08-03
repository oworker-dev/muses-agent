"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, } from "../ui/input-group.js";
import { cn } from "../utils.js";
import { CheckIcon, CopyIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
const SnippetContext = createContext({
    code: "",
});
export const Snippet = ({ code, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ code }), [code]);
    return (_jsx(SnippetContext.Provider, { value: contextValue, children: _jsx(InputGroup, { className: cn("font-mono", className), ...props, children: children }) }));
};
export const SnippetAddon = (props) => (_jsx(InputGroupAddon, { ...props }));
export const SnippetText = ({ className, ...props }) => (_jsx(InputGroupText, { className: cn("pl-2 font-normal text-muted-foreground", className), ...props }));
export const SnippetInput = ({ className, ...props }) => {
    const { code } = useContext(SnippetContext);
    return (_jsx(InputGroupInput, { className: cn("text-foreground", className), readOnly: true, value: code, ...props }));
};
export const SnippetCopyButton = ({ onCopy, onError, timeout = 2000, children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const { code } = useContext(SnippetContext);
    const copyToClipboard = useCallback(async () => {
        if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
            onError?.(new Error("Clipboard API not available"));
            return;
        }
        try {
            if (!isCopied) {
                await navigator.clipboard.writeText(code);
                setIsCopied(true);
                onCopy?.();
                timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
            }
        }
        catch (error) {
            onError?.(error);
        }
    }, [code, onCopy, onError, timeout, isCopied]);
    useEffect(() => () => {
        window.clearTimeout(timeoutRef.current);
    }, []);
    const Icon = isCopied ? CheckIcon : CopyIcon;
    return (_jsx(InputGroupButton, { "aria-label": "Copy", className: className, onClick: copyToClipboard, size: "icon-sm", title: "Copy", ...props, children: children ?? _jsx(Icon, { className: "size-3.5", size: 14 }) }));
};
//# sourceMappingURL=snippet.js.map