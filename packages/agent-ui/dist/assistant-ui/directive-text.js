"use client";
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from "react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { Badge } from "../ui/badge.js";
export function createDirectiveText(formatter, options) {
    const iconMap = options?.iconMap;
    const fallbackIcon = options?.fallbackIcon;
    const Component = ({ text }) => {
        const segments = formatter.parse(text);
        if (segments.length === 1 && segments[0].kind === "text") {
            return _jsx(_Fragment, { children: text });
        }
        return (_jsx(_Fragment, { children: segments.map((seg, i) => {
                if (seg.kind === "text") {
                    return (_jsx("span", { className: "whitespace-pre-wrap", children: seg.text }, i));
                }
                const Icon = iconMap?.[seg.type] ?? fallbackIcon;
                return (_jsxs(Badge, { variant: "secondary", "data-slot": "directive-text-chip", "data-directive-type": seg.type, "data-directive-id": seg.id, "aria-label": `${seg.type}: ${seg.label}`, className: "aui-directive-chip items-baseline text-[13px] leading-none [&_svg]:self-center", children: [Icon && _jsx(Icon, {}), seg.label] }, i));
            }) }));
    };
    Component.displayName = "DirectiveText";
    return Component;
}
const DirectiveTextImpl = createDirectiveText(unstable_defaultDirectiveFormatter);
export const DirectiveText = memo(DirectiveTextImpl);
//# sourceMappingURL=directive-text.js.map