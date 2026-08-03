"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Button } from "../ui/button.js";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, } from "../ui/command.js";
import { Popover, PopoverContent, PopoverTrigger, } from "../ui/popover.js";
import { cn } from "../utils.js";
import { ChevronsUpDownIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
const deviceIdRegex = /\(([\da-fA-F]{4}:[\da-fA-F]{4})\)$/;
const MicSelectorContext = createContext({
    data: [],
    onOpenChange: undefined,
    onValueChange: undefined,
    open: false,
    setWidth: undefined,
    value: undefined,
    width: 200,
});
export const useAudioDevices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const loadDevicesWithoutPermission = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const deviceList = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = deviceList.filter((device) => device.kind === "audioinput");
            setDevices(audioInputs);
        }
        catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to get audio devices";
            setError(message);
            console.error("Error getting audio devices:", message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const loadDevicesWithPermission = useCallback(async () => {
        if (loading) {
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const tempStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            for (const track of tempStream.getTracks()) {
                track.stop();
            }
            const deviceList = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = deviceList.filter((device) => device.kind === "audioinput");
            setDevices(audioInputs);
            setHasPermission(true);
        }
        catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to get audio devices";
            setError(message);
            console.error("Error getting audio devices:", message);
        }
        finally {
            setLoading(false);
        }
    }, [loading]);
    useEffect(() => {
        loadDevicesWithoutPermission();
    }, [loadDevicesWithoutPermission]);
    useEffect(() => {
        const handleDeviceChange = () => {
            if (hasPermission) {
                loadDevicesWithPermission();
            }
            else {
                loadDevicesWithoutPermission();
            }
        };
        navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
        };
    }, [hasPermission, loadDevicesWithPermission, loadDevicesWithoutPermission]);
    return {
        devices,
        error,
        hasPermission,
        loadDevices: loadDevicesWithPermission,
        loading,
    };
};
export const MicSelector = ({ defaultValue, value: controlledValue, onValueChange: controlledOnValueChange, defaultOpen = false, open: controlledOpen, onOpenChange: controlledOnOpenChange, ...props }) => {
    const [value, onValueChange] = useControllableState({
        defaultProp: defaultValue,
        onChange: controlledOnValueChange,
        prop: controlledValue,
    });
    const [open, onOpenChange] = useControllableState({
        defaultProp: defaultOpen,
        onChange: controlledOnOpenChange,
        prop: controlledOpen,
    });
    const [width, setWidth] = useState(200);
    const { devices, loading, hasPermission, loadDevices } = useAudioDevices();
    useEffect(() => {
        if (open && !hasPermission && !loading) {
            loadDevices();
        }
    }, [open, hasPermission, loading, loadDevices]);
    const contextValue = useMemo(() => ({
        data: devices,
        onOpenChange,
        onValueChange,
        open,
        setWidth,
        value,
        width,
    }), [devices, onOpenChange, onValueChange, open, setWidth, value, width]);
    return (_jsx(MicSelectorContext.Provider, { value: contextValue, children: _jsx(Popover, { ...props, onOpenChange: onOpenChange, open: open }) }));
};
export const MicSelectorTrigger = ({ children, ...props }) => {
    const { setWidth } = useContext(MicSelectorContext);
    const ref = useRef(null);
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.target.offsetWidth;
                if (newWidth) {
                    setWidth?.(newWidth);
                }
            }
        });
        if (ref.current) {
            resizeObserver.observe(ref.current);
        }
        return () => {
            resizeObserver.disconnect();
        };
    }, [setWidth]);
    return (_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", ...props, ref: ref, children: [children, _jsx(ChevronsUpDownIcon, { className: "shrink-0 text-muted-foreground", size: 16 })] }) }));
};
export const MicSelectorContent = ({ className, popoverOptions, ...props }) => {
    const { width, onValueChange, value } = useContext(MicSelectorContext);
    return (_jsx(PopoverContent, { className: cn("p-0", className), style: { width }, ...popoverOptions, children: _jsx(Command, { onValueChange: onValueChange, value: value, ...props }) }));
};
export const MicSelectorInput = ({ ...props }) => (_jsx(CommandInput, { placeholder: "Search microphones...", ...props }));
export const MicSelectorList = ({ children, ...props }) => {
    const { data } = useContext(MicSelectorContext);
    return _jsx(CommandList, { ...props, children: children(data) });
};
export const MicSelectorEmpty = ({ children = "No microphone found.", ...props }) => _jsx(CommandEmpty, { ...props, children: children });
export const MicSelectorItem = (props) => {
    const { onValueChange, onOpenChange } = useContext(MicSelectorContext);
    const handleSelect = useCallback((currentValue) => {
        onValueChange?.(currentValue);
        onOpenChange?.(false);
    }, [onValueChange, onOpenChange]);
    return _jsx(CommandItem, { onSelect: handleSelect, ...props });
};
export const MicSelectorLabel = ({ device, className, ...props }) => {
    const matches = device.label.match(deviceIdRegex);
    if (!matches) {
        return (_jsx("span", { className: className, ...props, children: device.label }));
    }
    const [, deviceId] = matches;
    const name = device.label.replace(deviceIdRegex, "");
    return (_jsxs("span", { className: className, ...props, children: [_jsx("span", { children: name }), _jsxs("span", { className: "text-muted-foreground", children: [" (", deviceId, ")"] })] }));
};
export const MicSelectorValue = ({ className, ...props }) => {
    const { data, value } = useContext(MicSelectorContext);
    const currentDevice = data.find((d) => d.deviceId === value);
    if (!currentDevice) {
        return (_jsx("span", { className: cn("flex-1 text-left", className), ...props, children: "Select microphone..." }));
    }
    return (_jsx(MicSelectorLabel, { className: cn("flex-1 text-left", className), device: currentDevice, ...props }));
};
//# sourceMappingURL=mic-selector.js.map