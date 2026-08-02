import { Button } from "../ui/button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import type { ComponentProps, HTMLAttributes } from "react";
import type { BundledLanguage, ThemedToken } from "shiki";
type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    code: string;
    language: BundledLanguage;
    showLineNumbers?: boolean;
};
interface TokenizedCode {
    tokens: ThemedToken[][];
    fg: string;
    bg: string;
}
export declare const highlightCode: (code: string, language: BundledLanguage, callback?: (result: TokenizedCode) => void) => TokenizedCode | null;
export declare const CodeBlockContainer: ({ className, language, style, ...props }: HTMLAttributes<HTMLDivElement> & {
    language: string;
}) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockHeader: ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockTitle: ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockFilename: ({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockActions: ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlockContent: ({ code, language, showLineNumbers, }: {
    code: string;
    language: BundledLanguage;
    showLineNumbers?: boolean;
}) => import("react/jsx-runtime").JSX.Element;
export declare const CodeBlock: ({ code, language, showLineNumbers, className, children, ...props }: CodeBlockProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};
export declare const CodeBlockCopyButton: ({ onCopy, onError, timeout, children, className, ...props }: CodeBlockCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockLanguageSelectorProps = ComponentProps<typeof Select>;
export declare const CodeBlockLanguageSelector: (props: CodeBlockLanguageSelectorProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockLanguageSelectorTriggerProps = ComponentProps<typeof SelectTrigger>;
export declare const CodeBlockLanguageSelectorTrigger: ({ className, ...props }: CodeBlockLanguageSelectorTriggerProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockLanguageSelectorValueProps = ComponentProps<typeof SelectValue>;
export declare const CodeBlockLanguageSelectorValue: (props: CodeBlockLanguageSelectorValueProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockLanguageSelectorContentProps = ComponentProps<typeof SelectContent>;
export declare const CodeBlockLanguageSelectorContent: ({ align, ...props }: CodeBlockLanguageSelectorContentProps) => import("react/jsx-runtime").JSX.Element;
export type CodeBlockLanguageSelectorItemProps = ComponentProps<typeof SelectItem>;
export declare const CodeBlockLanguageSelectorItem: (props: CodeBlockLanguageSelectorItemProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=code-block.d.ts.map