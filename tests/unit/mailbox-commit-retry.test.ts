import assert from "node:assert/strict";
import test from "node:test";
import type { AgentMailboxItem } from "../../server/data/agent-mailbox-store.ts";
import { commitMailboxReceiptWithRetry } from "../../agent/lib/mailbox-commit-retry.ts";

test("mailbox commit confirmation retries a transient product database outage", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const committed = { itemId: "mail-1", status: "committed" } as AgentMailboxItem;
  const result = await commitMailboxReceiptWithRetry({
    attempts: 4,
    baseDelayMs: 10,
    delay: async (milliseconds) => { delays.push(milliseconds); },
    itemId: "mail-1",
    maxDelayMs: 20,
    sessionId: "session-1",
    store: {
      async commit() {
        attempts += 1;
        if (attempts < 3) throw new Error("postgresql://secret@database.internal unavailable");
        return committed;
      },
    },
  });

  assert.equal(result, committed);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
});

test("mailbox commit confirmation fails closed without leaking database errors", async () => {
  await assert.rejects(
    commitMailboxReceiptWithRetry({
      attempts: 2,
      baseDelayMs: 1,
      delay: async () => undefined,
      itemId: "mail-1",
      maxDelayMs: 1,
      sessionId: "session-1",
      store: {
        async commit() {
          throw new Error("postgresql://secret@database.internal unavailable");
        },
      },
    }),
    (error: unknown) => error instanceof Error &&
      error.message === "Mailbox commit confirmation remained unavailable after 2 attempts." &&
      !error.message.includes("secret"),
  );
});
