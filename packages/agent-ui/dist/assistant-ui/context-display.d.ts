import type { ThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import { type FC, type ReactNode } from "react";
export type ContextDisplayLabels = {
    readonly cachedInput: string;
    readonly contextUsage: string;
    readonly input: string;
    readonly of: string;
    readonly output: string;
    readonly reasoning: string;
};
type PresetProps = {
    modelContextWindow: number;
    className?: string;
    label?: string;
    labels?: Partial<ContextDisplayLabels>;
    side?: "top" | "bottom" | "left" | "right";
    usage?: ThreadTokenUsage | undefined;
};
type ContextDisplayRootProps = {
    modelContextWindow: number;
    children: ReactNode;
    labels?: Partial<ContextDisplayLabels>;
    usage?: ThreadTokenUsage | undefined;
};
declare function ContextDisplayRoot(props: ContextDisplayRootProps): import("react/jsx-runtime").JSX.Element;
declare function ContextDisplayTrigger({ className, children, ...props }: React.ComponentProps<"button">): import("react/jsx-runtime").JSX.Element;
declare function ContextDisplayContent({ side, className, }: {
    side?: "top" | "bottom" | "left" | "right" | undefined;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare const ContextDisplayRing: FC<PresetProps>;
declare const ContextDisplayBar: FC<PresetProps>;
declare const ContextDisplayText: FC<PresetProps>;
declare const ContextDisplay: {
    Root: typeof ContextDisplayRoot;
    Trigger: typeof ContextDisplayTrigger;
    Content: typeof ContextDisplayContent;
    Ring: typeof ContextDisplayRing;
    Bar: typeof ContextDisplayBar;
    Text: typeof ContextDisplayText;
};
export { ContextDisplay, ContextDisplayRoot, ContextDisplayTrigger, ContextDisplayContent, ContextDisplayRing, ContextDisplayBar, ContextDisplayText, };
//# sourceMappingURL=context-display.d.ts.map