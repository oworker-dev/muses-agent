const DEFAULT_PROVIDER_HTTP_TIMEOUT_MS = 120_000;

export function readProviderHttpTimeoutMs(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = environment.AGENT_PROVIDER_HTTP_TIMEOUT_MS?.trim();
  if (!configured) return DEFAULT_PROVIDER_HTTP_TIMEOUT_MS;
  const timeout = Number(configured);
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 900_000) {
    throw new Error(
      "AGENT_PROVIDER_HTTP_TIMEOUT_MS must be an integer from 1000 to 900000.",
    );
  }
  return timeout;
}

export function createProviderFetch(
  timeoutMs = readProviderHttpTimeoutMs(),
  fetchImplementation: typeof fetch = globalThis.fetch,
): typeof fetch {
  return async (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
    return fetchImplementation(input, { ...init, signal });
  };
}
