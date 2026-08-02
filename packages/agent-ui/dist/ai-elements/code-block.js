"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../ui/select.js";
import { cn } from "../utils.js";
import { CheckIcon, CopyIcon } from "lucide-react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { createHighlighter } from "shiki";
const isItalic = (fontStyle) => fontStyle && fontStyle & 1;
const isBold = (fontStyle) => fontStyle && fontStyle & 2;
const isUnderline = (fontStyle) => fontStyle && fontStyle & 4;
const addKeysToTokens = (lines) => lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
        key: `line-${lineIdx}-${tokenIdx}`,
        token,
    })),
}));
const TokenSpan = ({ token }) => (_jsx("span", { className: "dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)]", style: {
        backgroundColor: token.bgColor,
        color: token.color,
        fontStyle: isItalic(token.fontStyle) ? "italic" : undefined,
        fontWeight: isBold(token.fontStyle) ? "bold" : undefined,
        textDecoration: isUnderline(token.fontStyle) ? "underline" : undefined,
        ...token.htmlStyle,
    }, children: token.content }));
const LINE_NUMBER_CLASSES = cn("block", "before:content-[counter(line)]", "before:inline-block", "before:[counter-increment:line]", "before:w-8", "before:mr-4", "before:text-right", "before:text-muted-foreground/50", "before:font-mono", "before:select-none");
const LineSpan = ({ keyedLine, showLineNumbers, }) => (_jsx("span", { className: showLineNumbers ? LINE_NUMBER_CLASSES : "block", children: keyedLine.tokens.length === 0
        ? "\n"
        : keyedLine.tokens.map(({ token, key }) => _jsx(TokenSpan, { token: token }, key)) }));
const CodeBlockContext = createContext({
    code: "",
});
const highlighterCache = new Map();
const tokensCache = new Map();
const subscribers = new Map();
const getTokensCacheKey = (code, language) => {
    const start = code.slice(0, 100);
    const end = code.length > 100 ? code.slice(-100) : "";
    return `${language}:${code.length}:${start}:${end}`;
};
const getHighlighter = (language) => {
    const cached = highlighterCache.get(language);
    if (cached) {
        return cached;
    }
    const highlighterPromise = createHighlighter({
        langs: [language],
        themes: ["github-light", "github-dark"],
    });
    highlighterCache.set(language, highlighterPromise);
    return highlighterPromise;
};
const createRawTokens = (code) => ({
    bg: "transparent",
    fg: "inherit",
    tokens: code.split("\n").map((line) => line === ""
        ? []
        : [
            {
                color: "inherit",
                content: line,
            },
        ]),
});
export const highlightCode = (code, language, callback) => {
    const tokensCacheKey = getTokensCacheKey(code, language);
    const cached = tokensCache.get(tokensCacheKey);
    if (cached) {
        return cached;
    }
    if (callback) {
        if (!subscribers.has(tokensCacheKey)) {
            subscribers.set(tokensCacheKey, new Set());
        }
        subscribers.get(tokensCacheKey)?.add(callback);
    }
    getHighlighter(language)
        .then((highlighter) => {
        const availableLangs = highlighter.getLoadedLanguages();
        const langToUse = availableLangs.includes(language) ? language : "text";
        const result = highlighter.codeToTokens(code, {
            lang: langToUse,
            themes: {
                dark: "github-dark",
                light: "github-light",
            },
        });
        const tokenized = {
            bg: result.bg ?? "transparent",
            fg: result.fg ?? "inherit",
            tokens: result.tokens,
        };
        tokensCache.set(tokensCacheKey, tokenized);
        const subs = subscribers.get(tokensCacheKey);
        if (subs) {
            for (const sub of subs) {
                sub(tokenized);
            }
            subscribers.delete(tokensCacheKey);
        }
    })
        .catch((error) => {
        console.error("Failed to highlight code:", error);
        subscribers.delete(tokensCacheKey);
    });
    return null;
};
const CodeBlockBody = memo(({ tokenized, showLineNumbers, className, }) => {
    const preStyle = useMemo(() => ({
        backgroundColor: tokenized.bg,
        color: tokenized.fg,
    }), [tokenized.bg, tokenized.fg]);
    const keyedLines = useMemo(() => addKeysToTokens(tokenized.tokens), [tokenized.tokens]);
    return (_jsx("pre", { className: cn("dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)] m-0 p-4 text-sm", className), style: preStyle, children: _jsx("code", { className: cn("font-mono text-sm", showLineNumbers && "[counter-increment:line_0] [counter-reset:line]"), children: keyedLines.map((keyedLine) => (_jsx(LineSpan, { keyedLine: keyedLine, showLineNumbers: showLineNumbers }, keyedLine.key))) }) }));
}, (prevProps, nextProps) => prevProps.tokenized === nextProps.tokenized &&
    prevProps.showLineNumbers === nextProps.showLineNumbers &&
    prevProps.className === nextProps.className);
CodeBlockBody.displayName = "CodeBlockBody";
export const CodeBlockContainer = ({ className, language, style, ...props }) => (_jsx("div", { className: cn("group relative w-full overflow-hidden rounded-md border bg-background text-foreground", className), "data-language": language, style: {
        containIntrinsicSize: "auto 200px",
        contentVisibility: "auto",
        ...style,
    }, ...props }));
export const CodeBlockHeader = ({ children, className, ...props }) => (_jsx("div", { className: cn("flex items-center justify-between border-b bg-muted/80 px-3 py-2 text-muted-foreground text-xs", className), ...props, children: children }));
export const CodeBlockTitle = ({ children, className, ...props }) => (_jsx("div", { className: cn("flex items-center gap-2", className), ...props, children: children }));
export const CodeBlockFilename = ({ children, className, ...props }) => (_jsx("span", { className: cn("font-mono", className), ...props, children: children }));
export const CodeBlockActions = ({ children, className, ...props }) => (_jsx("div", { className: cn("-my-1 -mr-1 flex items-center gap-2", className), ...props, children: children }));
export const CodeBlockContent = ({ code, language, showLineNumbers = false, }) => {
    const rawTokens = useMemo(() => createRawTokens(code), [code]);
    const syncTokens = useMemo(() => highlightCode(code, language) ?? rawTokens, [code, language, rawTokens]);
    const [asyncTokens, setAsyncTokens] = useState(null);
    const asyncKeyRef = useRef({ code, language });
    if (asyncKeyRef.current.code !== code || asyncKeyRef.current.language !== language) {
        asyncKeyRef.current = { code, language };
        setAsyncTokens(null);
    }
    useEffect(() => {
        let cancelled = false;
        highlightCode(code, language, (result) => {
            if (!cancelled) {
                setAsyncTokens(result);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [code, language]);
    const tokenized = asyncTokens ?? syncTokens;
    return (_jsx("div", { className: "relative overflow-auto", children: _jsx(CodeBlockBody, { showLineNumbers: showLineNumbers, tokenized: tokenized }) }));
};
export const CodeBlock = ({ code, language, showLineNumbers = false, className, children, ...props }) => {
    const contextValue = useMemo(() => ({ code }), [code]);
    return (_jsx(CodeBlockContext.Provider, { value: contextValue, children: _jsxs(CodeBlockContainer, { className: className, language: language, ...props, children: [children, _jsx(CodeBlockContent, { code: code, language: language, showLineNumbers: showLineNumbers })] }) }));
};
export const CodeBlockCopyButton = ({ onCopy, onError, timeout = 2000, children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef(0);
    const { code } = useContext(CodeBlockContext);
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
    return (_jsx(Button, { className: cn("shrink-0", className), onClick: copyToClipboard, size: "icon", variant: "ghost", ...props, children: children ?? _jsx(Icon, { size: 14 }) }));
};
export const CodeBlockLanguageSelector = (props) => (_jsx(Select, { ...props }));
export const CodeBlockLanguageSelectorTrigger = ({ className, ...props }) => (_jsx(SelectTrigger, { className: cn("h-7 border-none bg-transparent px-2 text-xs shadow-none", className), size: "sm", ...props }));
export const CodeBlockLanguageSelectorValue = (props) => (_jsx(SelectValue, { ...props }));
export const CodeBlockLanguageSelectorContent = ({ align = "end", ...props }) => _jsx(SelectContent, { align: align, ...props });
export const CodeBlockLanguageSelectorItem = (props) => (_jsx(SelectItem, { ...props }));
//# sourceMappingURL=code-block.js.map