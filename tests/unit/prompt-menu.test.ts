import assert from "node:assert/strict";
import test from "node:test";
import {
  filterPromptMenuItems,
  findPromptTrigger,
  replacePromptTrigger,
} from "../../packages/agent-ui/src/agent-workspace/prompt-menu.ts";

const items = [
  {
    id: "software-task",
    label: "Software task",
    value: "/software-task",
    description: "Work in a code repository",
    keywords: ["debug"],
  },
  { id: "research", label: "Research", value: "/research" },
] as const;

test("findPromptTrigger recognizes only the active trailing token", () => {
  assert.deepEqual(findPromptTrigger("/soft"), {
    end: 5,
    kind: "command",
    query: "soft",
    start: 0,
  });
  assert.deepEqual(findPromptTrigger("inspect @work"), {
    end: 13,
    kind: "mention",
    query: "work",
    start: 8,
  });
  assert.equal(findPromptTrigger("https://example.com"), undefined);
  assert.equal(findPromptTrigger("email@example.com"), undefined);
});

test("filterPromptMenuItems searches labels, descriptions, and keywords", () => {
  assert.deepEqual(filterPromptMenuItems(items, "debug").map((item) => item.id), ["software-task"]);
  assert.deepEqual(filterPromptMenuItems(items, "research").map((item) => item.id), ["research"]);
});

test("replacePromptTrigger preserves the rest of the prompt", () => {
  const input = "Please use /soft";
  const trigger = findPromptTrigger(input);
  assert.ok(trigger);
  assert.equal(replacePromptTrigger(input, trigger, "/software-task"), "Please use /software-task ");
});
