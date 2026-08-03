import type { HTMLAttributes } from "react";
type ChangeType = "major" | "minor" | "patch" | "added" | "removed";
export type PackageInfoHeaderProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoHeader: ({ className, children, ...props }: PackageInfoHeaderProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoNameProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoName: ({ className, children, ...props }: PackageInfoNameProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoChangeTypeProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoChangeType: ({ className, children, ...props }: PackageInfoChangeTypeProps) => import("react/jsx-runtime").JSX.Element | null;
export type PackageInfoVersionProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoVersion: ({ className, children, ...props }: PackageInfoVersionProps) => import("react/jsx-runtime").JSX.Element | null;
export type PackageInfoProps = HTMLAttributes<HTMLDivElement> & {
    name: string;
    currentVersion?: string;
    newVersion?: string;
    changeType?: ChangeType;
};
export declare const PackageInfo: ({ name, currentVersion, newVersion, changeType, className, children, ...props }: PackageInfoProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export declare const PackageInfoDescription: ({ className, children, ...props }: PackageInfoDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoContentProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoContent: ({ className, children, ...props }: PackageInfoContentProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoDependenciesProps = HTMLAttributes<HTMLDivElement>;
export declare const PackageInfoDependencies: ({ className, children, ...props }: PackageInfoDependenciesProps) => import("react/jsx-runtime").JSX.Element;
export type PackageInfoDependencyProps = HTMLAttributes<HTMLDivElement> & {
    name: string;
    version?: string;
};
export declare const PackageInfoDependency: ({ name, version, className, children, ...props }: PackageInfoDependencyProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=package-info.d.ts.map