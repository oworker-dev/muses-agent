import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils.js";
export const Image = ({ base64, uint8Array: _uint8Array, mediaType, ...props }) => (_jsx("img", { ...props, alt: props.alt, className: cn("h-auto max-w-full overflow-hidden rounded-md", props.className), src: `data:${mediaType};base64,${base64}` }));
//# sourceMappingURL=image.js.map