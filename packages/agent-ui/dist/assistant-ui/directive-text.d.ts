import { type FC } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/react";
type IconComponent = FC<{
    className?: string;
}>;
export type CreateDirectiveTextOptions = {
    iconMap?: Record<string, IconComponent>;
    fallbackIcon?: IconComponent;
};
export declare function createDirectiveText(formatter: Unstable_DirectiveFormatter, options?: CreateDirectiveTextOptions): TextMessagePartComponent;
export declare const DirectiveText: TextMessagePartComponent;
export {};
//# sourceMappingURL=directive-text.d.ts.map