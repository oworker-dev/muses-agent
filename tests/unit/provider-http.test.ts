import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderFetch,
  readProviderHttpTimeoutMs,
} from "../../lib/provider-http.ts";

test("parses a bounded provider HTTP timeout", () => {
  assert.equal(readProviderHttpTimeoutMs({}), 600_000);
  assert.equal(readProviderHttpTimeoutMs({ AGENT_PROVIDER_HTTP_TIMEOUT_MS: "45000" }), 45_000);
  assert.throws(
    () => readProviderHttpTimeoutMs({ AGENT_PROVIDER_HTTP_TIMEOUT_MS: "999" }),
    /from 1000 to 900000/,
  );
});

test("aborts a pending provider request at the configured timeout", async () => {
  const observed: { signal?: AbortSignal } = {};
  const pendingFetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal) observed.signal = init.signal;
    return new Promise<Response>((_resolve, reject) => {
      // AbortSignal.timeout() does not keep Node's event loop alive. This
      // fallback keeps the fixture alive and fails with the wrong error if the
      // provider timeout is ever lost.
      const fixtureTimeout = setTimeout(
        () => reject(new Error("Provider timeout signal was not delivered.")),
        200,
      );
      observed.signal?.addEventListener("abort", () => reject(observed.signal?.reason), { once: true });
      observed.signal?.addEventListener("abort", () => clearTimeout(fixtureTimeout), { once: true });
    });
  }) as typeof fetch;
  const providerFetch = createProviderFetch(20, pendingFetch);

  await assert.rejects(providerFetch("https://provider.test/v1/responses"), (error) =>
    error instanceof DOMException && error.name === "TimeoutError",
  );
  assert.equal(observed.signal?.aborted, true);
});

test("combines caller cancellation with the provider timeout", async () => {
  const caller = new AbortController();
  const pendingFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as typeof fetch;
  const providerFetch = createProviderFetch(60_000, pendingFetch);
  const request = providerFetch("https://provider.test/v1/responses", {
    signal: caller.signal,
  });

  caller.abort(new DOMException("Cancelled by caller.", "AbortError"));

  await assert.rejects(request, (error) =>
    error instanceof DOMException && error.name === "AbortError",
  );
});
