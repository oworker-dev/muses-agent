import type { HTMLAttributes, ReactNode } from "react";
export type FileTreeProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
    expanded?: Set<string>;
    defaultExpanded?: Set<string>;
    selectedPath?: string;
    onSelect?: (path: string) => void;
    onExpandedChange?: (expanded: Set<string>) => void;
};
export declare const FileTree: ({ expanded: controlledExpanded, defaultExpanded, selectedPath, onSelect, onExpandedChange, className, children, ...props }: FileTreeProps) => import("react/jsx-runtime").JSX.Element;
export type FileTreeIconProps = HTMLAttributes<HTMLSpanElement>;
export declare const FileTreeIcon: ({ className, children, ...props }: FileTreeIconProps) => import("react/jsx-runtime").JSX.Element;
export type FileTreeNameProps = HTMLAttributes<HTMLSpanElement>;
export declare const FileTreeName: ({ className, children, ...props }: FileTreeNameProps) => import("react/jsx-runtime").JSX.Element;
export type FileTreeFolderProps = HTMLAttributes<HTMLDivElement> & {
    path: string;
    name: string;
};
export declare const FileTreeFolder: ({ path, name, className, children, ...props }: FileTreeFolderProps) => import("react/jsx-runtime").JSX.Element;
export type FileTreeFileProps = HTMLAttributes<HTMLDivElement> & {
    path: string;
    name: string;
    icon?: ReactNode;
};
export declare const FileTreeFile: ({ path, name, icon, className, children, ...props }: FileTreeFileProps) => import("react/jsx-runtime").JSX.Element;
export type FileTreeActionsProps = HTMLAttributes<HTMLDivElement>;
export declare const FileTreeActions: ({ className, children, ...props }: FileTreeActionsProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=file-tree.d.ts.map