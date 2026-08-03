import type { AgentPromptMenuItem } from "./contracts.js";

export type PromptTrigger = {
  readonly end: number;
  readonly kind: "command" | "mention";
  readonly query: string;
  readonly start: number;
};

export function findPromptTrigger(input: string): PromptTrigger | undefined {
  const match = input.match(/(?:^|\s)([\/@])([^\s\/@]*)$/u);
  if (!match || match.index === undefined) return undefined;
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

export function filterPromptMenuItems(
  items: readonly AgentPromptMenuItem[],
  query: string,
): readonly AgentPromptMenuItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    [item.id, item.label, item.description, ...(item.keywords ?? [])]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(normalized)),
  );
}

export function replacePromptTrigger(
  input: string,
  trigger: PromptTrigger,
  value: string,
): string {
  const prefix = input.slice(0, trigger.start);
  const suffix = input.slice(trigger.end);
  const spacer = suffix.startsWith(" ") || suffix.length === 0 ? "" : " ";
  return `${prefix}${value}${spacer}${suffix}${suffix.length === 0 ? " " : ""}`;
}
