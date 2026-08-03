import type { RiveParameters } from "@rive-app/react-webgl2";
import type { FC } from "react";
export type PersonaState = "idle" | "listening" | "thinking" | "speaking" | "asleep";
interface PersonaProps {
    state: PersonaState;
    onLoad?: RiveParameters["onLoad"];
    onLoadError?: RiveParameters["onLoadError"];
    onReady?: () => void;
    onPause?: RiveParameters["onPause"];
    onPlay?: RiveParameters["onPlay"];
    onStop?: RiveParameters["onStop"];
    className?: string;
    variant?: keyof typeof sources;
}
declare const sources: {
    command: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
    glint: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
    halo: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
    mana: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
    obsidian: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
    opal: {
        dynamicColor: boolean;
        hasModel: boolean;
        source: string;
    };
};
export declare const Persona: FC<PersonaProps>;
export {};
//# sourceMappingURL=persona.d.ts.map