import assert from "node:assert/strict";
import test from "node:test";
import {
  signMailboxDispatchBody,
  verifyMailboxDispatchRequest,
} from "../../agent/lib/mailbox-dispatch-auth.ts";

const secret = "mailbox-dispatch-test-secret-at-least-32-bytes";

test("mailbox dispatch signatures bind the body and a fresh timestamp", () => {
  const now = 1_900_000_000_000;
  const body = JSON.stringify({ action: "inspect", sessionId: "session-1" });
  const headers = signMailboxDispatchBody(body, { now: () => now, secret });
  const request = new Request("https://runtime.test/eve/v1/internal/mailbox", {
    headers,
    method: "POST",
  });

  assert.equal(verifyMailboxDispatchRequest(request, body, { now: () => now, secret }), true);
  assert.equal(verifyMailboxDispatchRequest(request, `${body} `, { now: () => now, secret }), false);
  assert.equal(
    verifyMailboxDispatchRequest(request, body, { now: () => now + 60_001, secret }),
    false,
  );
});
