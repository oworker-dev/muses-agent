"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { ButtonGroup, ButtonGroupText, } from "../ui/button-group.js";
import { cn } from "../utils.js";
import { MediaControlBar, MediaController, MediaDurationDisplay, MediaMuteButton, MediaPlayButton, MediaSeekBackwardButton, MediaSeekForwardButton, MediaTimeDisplay, MediaTimeRange, MediaVolumeRange, } from "media-chrome/react";
export const AudioPlayer = ({ children, style, ...props }) => (_jsx(MediaController, { audio: true, "data-slot": "audio-player", style: {
        "--media-background-color": "transparent",
        "--media-button-icon-height": "1rem",
        "--media-button-icon-width": "1rem",
        "--media-control-background": "transparent",
        "--media-control-hover-background": "var(--color-accent)",
        "--media-control-padding": "0",
        "--media-font": "var(--font-sans)",
        "--media-font-size": "10px",
        "--media-icon-color": "currentColor",
        "--media-preview-time-background": "var(--color-background)",
        "--media-preview-time-border-radius": "var(--radius-md)",
        "--media-preview-time-text-shadow": "none",
        "--media-primary-color": "var(--color-primary)",
        "--media-range-bar-color": "var(--color-primary)",
        "--media-range-track-background": "var(--color-secondary)",
        "--media-secondary-color": "var(--color-secondary)",
        "--media-text-color": "var(--color-foreground)",
        "--media-tooltip-arrow-display": "none",
        "--media-tooltip-background": "var(--color-background)",
        "--media-tooltip-border-radius": "var(--radius-md)",
        ...style,
    }, ...props, children: children }));
export const AudioPlayerElement = ({ ...props }) => (_jsx("audio", { "data-slot": "audio-player-element", slot: "media", src: "src" in props
        ? props.src
        : `data:${props.data.mediaType};base64,${props.data.base64}`, ...props }));
export const AudioPlayerControlBar = ({ children, ...props }) => (_jsx(MediaControlBar, { "data-slot": "audio-player-control-bar", ...props, children: _jsx(ButtonGroup, { orientation: "horizontal", children: children }) }));
export const AudioPlayerPlayButton = ({ className, ...props }) => (_jsx(Button, { asChild: true, size: "icon-sm", variant: "outline", children: _jsx(MediaPlayButton, { className: cn("bg-transparent", className), "data-slot": "audio-player-play-button", ...props }) }));
export const AudioPlayerSeekBackwardButton = ({ seekOffset = 10, ...props }) => (_jsx(Button, { asChild: true, size: "icon-sm", variant: "outline", children: _jsx(MediaSeekBackwardButton, { "data-slot": "audio-player-seek-backward-button", seekOffset: seekOffset, ...props }) }));
export const AudioPlayerSeekForwardButton = ({ seekOffset = 10, ...props }) => (_jsx(Button, { asChild: true, size: "icon-sm", variant: "outline", children: _jsx(MediaSeekForwardButton, { "data-slot": "audio-player-seek-forward-button", seekOffset: seekOffset, ...props }) }));
export const AudioPlayerTimeDisplay = ({ className, ...props }) => (_jsx(ButtonGroupText, { asChild: true, className: "bg-transparent", children: _jsx(MediaTimeDisplay, { className: cn("tabular-nums", className), "data-slot": "audio-player-time-display", ...props }) }));
export const AudioPlayerTimeRange = ({ className, ...props }) => (_jsx(ButtonGroupText, { asChild: true, className: "bg-transparent", children: _jsx(MediaTimeRange, { className: cn("", className), "data-slot": "audio-player-time-range", ...props }) }));
export const AudioPlayerDurationDisplay = ({ className, ...props }) => (_jsx(ButtonGroupText, { asChild: true, className: "bg-transparent", children: _jsx(MediaDurationDisplay, { className: cn("tabular-nums", className), "data-slot": "audio-player-duration-display", ...props }) }));
export const AudioPlayerMuteButton = ({ className, ...props }) => (_jsx(ButtonGroupText, { asChild: true, className: "bg-transparent", children: _jsx(MediaMuteButton, { className: cn("", className), "data-slot": "audio-player-mute-button", ...props }) }));
export const AudioPlayerVolumeRange = ({ className, ...props }) => (_jsx(ButtonGroupText, { asChild: true, className: "bg-transparent", children: _jsx(MediaVolumeRange, { className: cn("", className), "data-slot": "audio-player-volume-range", ...props }) }));
//# sourceMappingURL=audio-player.js.map