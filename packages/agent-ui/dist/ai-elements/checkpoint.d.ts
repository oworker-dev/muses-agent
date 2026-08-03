import { Button } from "../ui/button.js";
import type { LucideProps } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
export type CheckpointProps = HTMLAttributes<HTMLDivElement>;
export declare const Checkpoint: ({ className, children, ...props }: CheckpointProps) => import("react/jsx-runtime").JSX.Element;
export type CheckpointIconProps = LucideProps;
export declare const CheckpointIcon: ({ className, children, ...props }: CheckpointIconProps) => string | number | bigint | boolean | import("react/jsx-runtime").JSX.Element | Iterable<import("react").ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<import("react").ReactNode> | null | undefined>;
export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
    tooltip?: string;
};
export declare const CheckpointTrigger: ({ children, variant, size, tooltip, ...props }: CheckpointTriggerProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=checkpoint.d.ts.map