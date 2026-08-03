import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "../ui/input-group.js";
import type { ComponentProps } from "react";
export type SnippetProps = ComponentProps<typeof InputGroup> & {
    code: string;
};
export declare const Snippet: ({ code, className, children, ...props }: SnippetProps) => import("react/jsx-runtime").JSX.Element;
export type SnippetAddonProps = ComponentProps<typeof InputGroupAddon>;
export declare const SnippetAddon: (props: SnippetAddonProps) => import("react/jsx-runtime").JSX.Element;
export type SnippetTextProps = ComponentProps<typeof InputGroupText>;
export declare const SnippetText: ({ className, ...props }: SnippetTextProps) => import("react/jsx-runtime").JSX.Element;
export type SnippetInputProps = Omit<ComponentProps<typeof InputGroupInput>, "readOnly" | "value">;
export declare const SnippetInput: ({ className, ...props }: SnippetInputProps) => import("react/jsx-runtime").JSX.Element;
export type SnippetCopyButtonProps = ComponentProps<typeof InputGroupButton> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};
export declare const SnippetCopyButton: ({ onCopy, onError, timeout, children, className, ...props }: SnippetCopyButtonProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=snippet.d.ts.map