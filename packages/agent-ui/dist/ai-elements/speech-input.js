"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { Spinner } from "../ui/spinner.js";
import { cn } from "../utils.js";
import { MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
const detectSpeechInputMode = () => {
    if (typeof window === "undefined") {
        return "none";
    }
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
        return "speech-recognition";
    }
    if ("MediaRecorder" in window && "mediaDevices" in navigator) {
        return "media-recorder";
    }
    return "none";
};
export const SpeechInput = ({ className, onTranscriptionChange, onAudioRecorded, lang = "en-US", ...props }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode] = useState(detectSpeechInputMode);
    const [isRecognitionReady, setIsRecognitionReady] = useState(false);
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const onTranscriptionChangeRef = useRef(onTranscriptionChange);
    const onAudioRecordedRef = useRef(onAudioRecorded);
    onTranscriptionChangeRef.current = onTranscriptionChange;
    onAudioRecordedRef.current = onAudioRecorded;
    useEffect(() => {
        if (mode !== "speech-recognition") {
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = lang;
        const handleStart = () => {
            setIsListening(true);
        };
        const handleEnd = () => {
            setIsListening(false);
        };
        const handleResult = (event) => {
            const speechEvent = event;
            let finalTranscript = "";
            for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i += 1) {
                const result = speechEvent.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0]?.transcript ?? "";
                }
            }
            if (finalTranscript) {
                onTranscriptionChangeRef.current?.(finalTranscript);
            }
        };
        const handleError = () => {
            setIsListening(false);
        };
        speechRecognition.addEventListener("start", handleStart);
        speechRecognition.addEventListener("end", handleEnd);
        speechRecognition.addEventListener("result", handleResult);
        speechRecognition.addEventListener("error", handleError);
        recognitionRef.current = speechRecognition;
        setIsRecognitionReady(true);
        return () => {
            speechRecognition.removeEventListener("start", handleStart);
            speechRecognition.removeEventListener("end", handleEnd);
            speechRecognition.removeEventListener("result", handleResult);
            speechRecognition.removeEventListener("error", handleError);
            speechRecognition.stop();
            recognitionRef.current = null;
            setIsRecognitionReady(false);
        };
    }, [mode, lang]);
    useEffect(() => () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) {
                track.stop();
            }
        }
    }, []);
    const startMediaRecorder = useCallback(async () => {
        if (!onAudioRecordedRef.current) {
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            const handleDataAvailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            const handleStop = async () => {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
                streamRef.current = null;
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                if (audioBlob.size > 0 && onAudioRecordedRef.current) {
                    setIsProcessing(true);
                    try {
                        const transcript = await onAudioRecordedRef.current(audioBlob);
                        if (transcript) {
                            onTranscriptionChangeRef.current?.(transcript);
                        }
                    }
                    catch {
                    }
                    finally {
                        setIsProcessing(false);
                    }
                }
            };
            const handleError = () => {
                setIsListening(false);
                for (const track of stream.getTracks()) {
                    track.stop();
                }
                streamRef.current = null;
            };
            mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
            mediaRecorder.addEventListener("stop", handleStop);
            mediaRecorder.addEventListener("error", handleError);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsListening(true);
        }
        catch {
            setIsListening(false);
        }
    }, []);
    const stopMediaRecorder = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
    }, []);
    const toggleListening = useCallback(() => {
        if (mode === "speech-recognition" && recognitionRef.current) {
            if (isListening) {
                recognitionRef.current.stop();
            }
            else {
                recognitionRef.current.start();
            }
        }
        else if (mode === "media-recorder") {
            if (isListening) {
                stopMediaRecorder();
            }
            else {
                startMediaRecorder();
            }
        }
    }, [mode, isListening, startMediaRecorder, stopMediaRecorder]);
    const isDisabled = mode === "none" ||
        (mode === "speech-recognition" && !isRecognitionReady) ||
        (mode === "media-recorder" && !onAudioRecorded) ||
        isProcessing;
    return (_jsxs("div", { className: "relative inline-flex items-center justify-center", children: [isListening &&
                [0, 1, 2].map((index) => (_jsx("div", { className: "absolute inset-0 animate-ping rounded-full border-2 border-red-400/30", style: {
                        animationDelay: `${index * 0.3}s`,
                        animationDuration: "2s",
                    } }, index))), _jsxs(Button, { className: cn("relative z-10 rounded-full transition-all duration-300", isListening
                    ? "bg-destructive text-white hover:bg-destructive/80 hover:text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground", className), disabled: isDisabled, onClick: toggleListening, ...props, children: [isProcessing && _jsx(Spinner, {}), !isProcessing && isListening && _jsx(SquareIcon, { className: "size-4" }), !(isProcessing || isListening) && _jsx(MicIcon, { className: "size-4" })] })] }));
};
//# sourceMappingURL=speech-input.js.map