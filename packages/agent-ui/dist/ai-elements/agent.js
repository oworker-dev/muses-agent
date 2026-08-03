"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "../ui/accordion.js";
import { Badge } from "../ui/badge.js";
import { cn } from "../utils.js";
import { BotIcon } from "lucide-react";
import { memo } from "react";
import { CodeBlock } from "./code-block.js";
export const Agent = memo(({ className, ...props }) => (_jsx("div", { className: cn("not-prose w-full rounded-md border", className), ...props })));
export const AgentHeader = memo(({ className, name, model, ...props }) => (_jsx("div", { className: cn("flex w-full items-center justify-between gap-4 p-3", className), ...props, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BotIcon, { className: "size-4 text-muted-foreground" }), _jsx("span", { className: "font-medium text-sm", children: name }), model && (_jsx(Badge, { className: "font-mono text-xs", variant: "secondary", children: model }))] }) })));
export const AgentContent = memo(({ className, ...props }) => (_jsx("div", { className: cn("space-y-4 p-4 pt-0", className), ...props })));
export const AgentInstructions = memo(({ className, children, ...props }) => (_jsxs("div", { className: cn("space-y-2", className), ...props, children: [_jsx("span", { className: "font-medium text-muted-foreground text-sm", children: "Instructions" }), _jsx("div", { className: "rounded-md bg-muted/50 p-3 text-muted-foreground text-sm", children: _jsx("p", { children: children }) })] })));
export const AgentTools = memo(({ className, ...props }) => (_jsxs("div", { className: cn("space-y-2", className), children: [_jsx("span", { className: "font-medium text-muted-foreground text-sm", children: "Tools" }), _jsx(Accordion, { className: "rounded-md border", ...props })] })));
export const AgentTool = memo(({ className, tool, value, ...props }) => {
    const schema = "jsonSchema" in tool && tool.jsonSchema
        ? tool.jsonSchema
        : tool.inputSchema;
    return (_jsxs(AccordionItem, { className: cn("border-b last:border-b-0", className), value: value, ...props, children: [_jsx(AccordionTrigger, { className: "px-3 py-2 text-sm hover:no-underline", children: typeof tool.description === "string" ? tool.description : "No description" }), _jsx(AccordionContent, { className: "px-3 pb-3", children: _jsx("div", { className: "rounded-md bg-muted/50", children: _jsx(CodeBlock, { code: JSON.stringify(schema, null, 2), language: "json" }) }) })] }));
});
export const AgentOutput = memo(({ className, schema, ...props }) => (_jsxs("div", { className: cn("space-y-2", className), ...props, children: [_jsx("span", { className: "font-medium text-muted-foreground text-sm", children: "Output Schema" }), _jsx("div", { className: "rounded-md bg-muted/50", children: _jsx(CodeBlock, { code: schema, language: "typescript" }) })] })));
Agent.displayName = "Agent";
AgentHeader.displayName = "AgentHeader";
AgentContent.displayName = "AgentContent";
AgentInstructions.displayName = "AgentInstructions";
AgentTools.displayName = "AgentTools";
AgentTool.displayName = "AgentTool";
AgentOutput.displayName = "AgentOutput";
//# sourceMappingURL=agent.js.map