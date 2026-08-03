import type { Experimental_TranscriptionResult as TranscriptionResult } from "ai";
import type { ComponentProps, ReactNode } from "react";
type TranscriptionSegment = TranscriptionResult["segments"][number];
export type TranscriptionProps = Omit<ComponentProps<"div">, "children"> & {
    segments: TranscriptionSegment[];
    currentTime?: number;
    onSeek?: (time: number) => void;
    children: (segment: TranscriptionSegment, index: number) => ReactNode;
};
export declare const Transcription: ({ segments, currentTime: externalCurrentTime, onSeek, className, children, ...props }: TranscriptionProps) => import("react/jsx-runtime").JSX.Element;
export type TranscriptionSegmentProps = ComponentProps<"button"> & {
    segment: TranscriptionSegment;
    index: number;
};
export declare const TranscriptionSegment: ({ segment, index, className, onClick, ...props }: TranscriptionSegmentProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=transcription.d.ts.map