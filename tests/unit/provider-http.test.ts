import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderFetch,
  readProviderHttpTimeoutMs,
} from "../../lib/provider-http.ts";

test("parses a bounded provider HTTP timeout", () => {
  assert.equal(readProviderHttpTimeoutMs({}), 120_000);
  assert.equal(readProviderHttpTimeoutMs({ AGENT_PROVIDER_HTTP_TIMEOUT_MS: "45000" }), 45_000);
  assert.throws(
    () => readProviderHttpTimeoutMs({ AGENT_PROVIDER_HTTP_TIMEOUT_MS: "999" }),
    /from 1000 to 900000/,
  );
});

test("combines caller cancellation with the provider timeout", async () => {
  const observed: { signal?: AbortSignal } = {};
  const pendingFetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal) observed.signal = init.signal;
    return new Promise<Response>((_resolve, reject) => {
      observed.signal?.addEventListener("abort", () => reject(observed.signal?.reason), { once: true });
    });
  }) as typeof fetch;
  const providerFetch = createProviderFetch(20, pendingFetch);

  await assert.rejects(providerFetch("https://provider.test/v1/responses"), (error) =>
    error instanceof DOMException && error.name === "TimeoutError",
  );
  assert.equal(observed.signal?.aborted, true);
});
