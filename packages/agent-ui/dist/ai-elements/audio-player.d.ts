import type { Experimental_SpeechResult as SpeechResult } from "ai";
import { MediaControlBar, MediaController, MediaDurationDisplay, MediaMuteButton, MediaPlayButton, MediaSeekBackwardButton, MediaSeekForwardButton, MediaTimeDisplay, MediaTimeRange, MediaVolumeRange } from "media-chrome/react";
import type { ComponentProps } from "react";
export type AudioPlayerProps = Omit<ComponentProps<typeof MediaController>, "audio">;
export declare const AudioPlayer: ({ children, style, ...props }: AudioPlayerProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerElementProps = Omit<ComponentProps<"audio">, "src"> & ({
    data: SpeechResult["audio"];
} | {
    src: string;
});
export declare const AudioPlayerElement: ({ ...props }: AudioPlayerElementProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerControlBarProps = ComponentProps<typeof MediaControlBar>;
export declare const AudioPlayerControlBar: ({ children, ...props }: AudioPlayerControlBarProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerPlayButtonProps = ComponentProps<typeof MediaPlayButton>;
export declare const AudioPlayerPlayButton: ({ className, ...props }: AudioPlayerPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerSeekBackwardButtonProps = ComponentProps<typeof MediaSeekBackwardButton>;
export declare const AudioPlayerSeekBackwardButton: ({ seekOffset, ...props }: AudioPlayerSeekBackwardButtonProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerSeekForwardButtonProps = ComponentProps<typeof MediaSeekForwardButton>;
export declare const AudioPlayerSeekForwardButton: ({ seekOffset, ...props }: AudioPlayerSeekForwardButtonProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerTimeDisplayProps = ComponentProps<typeof MediaTimeDisplay>;
export declare const AudioPlayerTimeDisplay: ({ className, ...props }: AudioPlayerTimeDisplayProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerTimeRangeProps = ComponentProps<typeof MediaTimeRange>;
export declare const AudioPlayerTimeRange: ({ className, ...props }: AudioPlayerTimeRangeProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerDurationDisplayProps = ComponentProps<typeof MediaDurationDisplay>;
export declare const AudioPlayerDurationDisplay: ({ className, ...props }: AudioPlayerDurationDisplayProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerMuteButtonProps = ComponentProps<typeof MediaMuteButton>;
export declare const AudioPlayerMuteButton: ({ className, ...props }: AudioPlayerMuteButtonProps) => import("react/jsx-runtime").JSX.Element;
export type AudioPlayerVolumeRangeProps = ComponentProps<typeof MediaVolumeRange>;
export declare const AudioPlayerVolumeRange: ({ className, ...props }: AudioPlayerVolumeRangeProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=audio-player.d.ts.map