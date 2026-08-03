export function findPromptTrigger(input) {
    const match = input.match(/(?:^|\s)([\/@])([^\s\/@]*)$/u);
    if (!match || match.index === undefined)
        return undefined;
    const marker = match[1];
    const markerOffset = match[0].lastIndexOf(marker);
    const start = match.index + markerOffset;
    return {
        end: input.length,
        kind: marker === "/" ? "command" : "mention",
        query: match[2] ?? "",
        start,
    };
}
export function filterPromptMenuItems(items, query) {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized)
        return items;
    return items.filter((item) => [item.id, item.label, item.description, ...(item.keywords ?? [])]
        .filter((value) => typeof value === "string")
        .some((value) => value.toLocaleLowerCase().includes(normalized)));
}
export function replacePromptTrigger(input, trigger, value) {
    const prefix = input.slice(0, trigger.start);
    const suffix = input.slice(trigger.end);
    const spacer = suffix.startsWith(" ") || suffix.length === 0 ? "" : " ";
    return `${prefix}${value}${spacer}${suffix}${suffix.length === 0 ? " " : ""}`;
}
//# sourceMappingURL=prompt-menu.js.map