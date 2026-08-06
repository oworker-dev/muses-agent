import assert from "node:assert/strict";
import test from "node:test";

import { compactThreadEvents, parseThreadCollection } from "@oworker/open-agent-ui/agent-workspace";

test("compacts legacy cumulative deltas without changing the absolute stream cursor", () => {
  const at = new Date().toISOString();
  const events = Array.from({ length: 1_000 }, (_, index) => ({
    data: {
      messageDelta: "x",
      messageSoFar: "x".repeat(index + 1),
      sequence: 0,
      stepIndex: 0,
      turnId: "turn_0",
    },
    meta: { at },
    type: "message.appended",
  }));
  const collection = parseThreadCollection({
    activeThreadId: "thread-0",
    threads: [{
      createdAt: 1,
      events,
      id: "thread-0",
      preferences: { modelId: "model", reasoning: "medium" },
      session: { sessionId: "session-0", streamIndex: events.length },
      status: "streaming",
      title: "Thread",
      updatedAt: 1,
    }],
    version: 1,
  });

  assert.equal(collection.threads[0]?.events.length, 1);
  assert.equal(collection.threads[0]?.session.streamIndex, 1_000);
});

test("preserves non-delta ordering barriers while compacting adjacent cumulative deltas", () => {
  const at = new Date().toISOString();
  const appended = (messageSoFar: string) => ({
    data: { messageDelta: "x", messageSoFar, sequence: 0, stepIndex: 0, turnId: "turn_0" },
    meta: { at },
    type: "message.appended",
  }) as const;
  const barrier = {
    data: { sequence: 0, stepIndex: 1, turnId: "turn_0" },
    meta: { at },
    type: "step.started",
  } as const;

  const compacted = compactThreadEvents([
    appended("one"),
    appended("one two"),
    barrier,
    appended("one two three"),
  ]);

  assert.deepEqual(compacted.map((event) => event.type), [
    "message.appended",
    "step.started",
    "message.appended",
  ]);
});
