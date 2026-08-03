"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Button } from "../ui/button.js";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut, } from "../ui/command.js";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, } from "../ui/dialog.js";
import { Spinner } from "../ui/spinner.js";
import { cn } from "../utils.js";
import { CircleSmallIcon, MarsIcon, MarsStrokeIcon, NonBinaryIcon, PauseIcon, PlayIcon, TransgenderIcon, VenusAndMarsIcon, VenusIcon, } from "lucide-react";
import { createContext, useCallback, useContext, useMemo } from "react";
const VoiceSelectorContext = createContext(null);
export const useVoiceSelector = () => {
    const context = useContext(VoiceSelectorContext);
    if (!context) {
        throw new Error("VoiceSelector components must be used within VoiceSelector");
    }
    return context;
};
export const VoiceSelector = ({ value: valueProp, defaultValue, onValueChange, open: openProp, defaultOpen = false, onOpenChange, children, ...props }) => {
    const [value, setValue] = useControllableState({
        defaultProp: defaultValue,
        onChange: onValueChange,
        prop: valueProp,
    });
    const [open, setOpen] = useControllableState({
        defaultProp: defaultOpen,
        onChange: onOpenChange,
        prop: openProp,
    });
    const voiceSelectorContext = useMemo(() => ({ open, setOpen, setValue, value }), [value, setValue, open, setOpen]);
    return (_jsx(VoiceSelectorContext.Provider, { value: voiceSelectorContext, children: _jsx(Dialog, { onOpenChange: setOpen, open: open, ...props, children: children }) }));
};
export const VoiceSelectorTrigger = (props) => (_jsx(DialogTrigger, { ...props }));
export const VoiceSelectorContent = ({ className, children, title = "Voice Selector", ...props }) => (_jsxs(DialogContent, { "aria-describedby": undefined, className: cn("p-0", className), ...props, children: [_jsx(DialogTitle, { className: "sr-only", children: title }), _jsx(Command, { className: "**:data-[slot=command-input-wrapper]:h-auto", children: children })] }));
export const VoiceSelectorDialog = (props) => (_jsx(CommandDialog, { ...props }));
export const VoiceSelectorInput = ({ className, ...props }) => (_jsx(CommandInput, { className: cn("h-auto py-3.5", className), ...props }));
export const VoiceSelectorList = (props) => (_jsx(CommandList, { ...props }));
export const VoiceSelectorEmpty = (props) => (_jsx(CommandEmpty, { ...props }));
export const VoiceSelectorGroup = (props) => (_jsx(CommandGroup, { ...props }));
export const VoiceSelectorItem = ({ className, ...props }) => (_jsx(CommandItem, { className: cn("px-4 py-2", className), ...props }));
export const VoiceSelectorShortcut = (props) => (_jsx(CommandShortcut, { ...props }));
export const VoiceSelectorSeparator = (props) => (_jsx(CommandSeparator, { ...props }));
export const VoiceSelectorGender = ({ className, value, children, ...props }) => {
    let icon = null;
    switch (value) {
        case "male": {
            icon = _jsx(MarsIcon, { className: "size-4" });
            break;
        }
        case "female": {
            icon = _jsx(VenusIcon, { className: "size-4" });
            break;
        }
        case "transgender": {
            icon = _jsx(TransgenderIcon, { className: "size-4" });
            break;
        }
        case "androgyne": {
            icon = _jsx(MarsStrokeIcon, { className: "size-4" });
            break;
        }
        case "non-binary": {
            icon = _jsx(NonBinaryIcon, { className: "size-4" });
            break;
        }
        case "intersex": {
            icon = _jsx(VenusAndMarsIcon, { className: "size-4" });
            break;
        }
        default: {
            icon = _jsx(CircleSmallIcon, { className: "size-4" });
        }
    }
    return (_jsx("span", { className: cn("text-muted-foreground text-xs", className), ...props, children: children ?? icon }));
};
export const VoiceSelectorAccent = ({ className, value, children, ...props }) => {
    let emoji = null;
    switch (value) {
        case "american": {
            emoji = "🇺🇸";
            break;
        }
        case "british": {
            emoji = "🇬🇧";
            break;
        }
        case "australian": {
            emoji = "🇦🇺";
            break;
        }
        case "canadian": {
            emoji = "🇨🇦";
            break;
        }
        case "irish": {
            emoji = "🇮🇪";
            break;
        }
        case "scottish": {
            emoji = "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
            break;
        }
        case "indian": {
            emoji = "🇮🇳";
            break;
        }
        case "south-african": {
            emoji = "🇿🇦";
            break;
        }
        case "new-zealand": {
            emoji = "🇳🇿";
            break;
        }
        case "spanish": {
            emoji = "🇪🇸";
            break;
        }
        case "french": {
            emoji = "🇫🇷";
            break;
        }
        case "german": {
            emoji = "🇩🇪";
            break;
        }
        case "italian": {
            emoji = "🇮🇹";
            break;
        }
        case "portuguese": {
            emoji = "🇵🇹";
            break;
        }
        case "brazilian": {
            emoji = "🇧🇷";
            break;
        }
        case "mexican": {
            emoji = "🇲🇽";
            break;
        }
        case "argentinian": {
            emoji = "🇦🇷";
            break;
        }
        case "japanese": {
            emoji = "🇯🇵";
            break;
        }
        case "chinese": {
            emoji = "🇨🇳";
            break;
        }
        case "korean": {
            emoji = "🇰🇷";
            break;
        }
        case "russian": {
            emoji = "🇷🇺";
            break;
        }
        case "arabic": {
            emoji = "🇸🇦";
            break;
        }
        case "dutch": {
            emoji = "🇳🇱";
            break;
        }
        case "swedish": {
            emoji = "🇸🇪";
            break;
        }
        case "norwegian": {
            emoji = "🇳🇴";
            break;
        }
        case "danish": {
            emoji = "🇩🇰";
            break;
        }
        case "finnish": {
            emoji = "🇫🇮";
            break;
        }
        case "polish": {
            emoji = "🇵🇱";
            break;
        }
        case "turkish": {
            emoji = "🇹🇷";
            break;
        }
        case "greek": {
            emoji = "🇬🇷";
            break;
        }
        default: {
            emoji = null;
        }
    }
    return (_jsx("span", { className: cn("text-muted-foreground text-xs", className), ...props, children: children ?? emoji }));
};
export const VoiceSelectorAge = ({ className, ...props }) => (_jsx("span", { className: cn("text-muted-foreground text-xs tabular-nums", className), ...props }));
export const VoiceSelectorName = ({ className, ...props }) => (_jsx("span", { className: cn("flex-1 truncate text-left font-medium", className), ...props }));
export const VoiceSelectorDescription = ({ className, ...props }) => (_jsx("span", { className: cn("text-muted-foreground text-xs", className), ...props }));
export const VoiceSelectorAttributes = ({ className, children, ...props }) => (_jsx("div", { className: cn("flex items-center text-xs", className), ...props, children: children }));
export const VoiceSelectorBullet = ({ className, ...props }) => (_jsx("span", { "aria-hidden": "true", className: cn("select-none text-border", className), ...props, children: "\u2022" }));
export const VoiceSelectorPreview = ({ className, playing, loading, onPlay, onClick, ...props }) => {
    const handleClick = useCallback((event) => {
        event.stopPropagation();
        onClick?.(event);
        onPlay?.();
    }, [onClick, onPlay]);
    let icon = _jsx(PlayIcon, { className: "size-3" });
    if (loading) {
        icon = _jsx(Spinner, { className: "size-3" });
    }
    else if (playing) {
        icon = _jsx(PauseIcon, { className: "size-3" });
    }
    return (_jsx(Button, { "aria-label": playing ? "Pause preview" : "Play preview", className: cn("size-6", className), disabled: loading, onClick: handleClick, size: "icon-sm", type: "button", variant: "outline", ...props, children: icon }));
};
//# sourceMappingURL=voice-selector.js.map