import assert from "node:assert/strict";
import test from "node:test";

import {
  EveOwnedProviderAttemptError,
  preventReplayAfterStreamStarts,
  ProviderStreamInterruptedError,
  oneProviderAttempt,
} from "../../lib/provider-retry-boundary.ts";

test("wraps one Provider attempt while preserving its diagnostic cause", async () => {
  const providerError = Object.assign(new Error("Rate limited"), {
    isRetryable: true,
    statusCode: 429,
  });
  await assert.rejects(
    oneProviderAttempt(async () => {
      throw providerError;
    }),
    (error: unknown) =>
      error instanceof EveOwnedProviderAttemptError &&
      error.message === "Rate limited" &&
      error.cause === providerError,
  );
});

test("preserves abort errors for Eve cancellation", async () => {
  const abort = new DOMException("Cancelled", "AbortError");
  await assert.rejects(
    oneProviderAttempt(async () => {
      throw abort;
    }),
    (error: unknown) => error === abort,
  );
});

test("preserves a stream failure before Provider output so Eve may retry", async () => {
  const providerError = new TypeError("connection failed");
  const stream = preventReplayAfterStreamStarts(new ReadableStream({
    start(controller) {
      controller.error(providerError);
    },
  }));
  await assert.rejects(stream.getReader().read(), (error: unknown) => error === providerError);
});

test("prevents automatic replay after Provider output has started", async () => {
  const providerError = new TypeError("terminated");
  let pullCount = 0;
  const stream = preventReplayAfterStreamStarts(new ReadableStream<string>({
    pull(controller) {
      pullCount += 1;
      if (pullCount === 1) controller.enqueue("partial");
      else controller.error(providerError);
    },
  }));
  const reader = stream.getReader();
  assert.deepEqual(await reader.read(), { done: false, value: "partial" });
  await assert.rejects(
    reader.read(),
    (error: unknown) =>
      error instanceof ProviderStreamInterruptedError && error.cause === undefined,
  );
});

test("converts a post-start error part into a recoverable interruption", async () => {
  const stream = preventReplayAfterStreamStarts(new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "stream-start" });
      controller.enqueue({ type: "error", error: new TypeError("terminated") });
      controller.close();
    },
  }));
  const reader = stream.getReader();
  assert.deepEqual(await reader.read(), { done: false, value: { type: "stream-start" } });
  const errorPart = await reader.read();
  assert.equal(errorPart.done, false);
  assert(errorPart.value.error instanceof ProviderStreamInterruptedError);
  assert.equal(errorPart.value.error.cause, undefined);
});
