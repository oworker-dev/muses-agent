import type { AgentMailboxItem, AgentMailboxStore } from "../../server/data/agent-mailbox-store";

const DEFAULT_ATTEMPTS = 6;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 2_000;

export async function commitMailboxReceiptWithRetry(options: {
  readonly attempts?: number;
  readonly baseDelayMs?: number;
  readonly delay?: (milliseconds: number) => Promise<void>;
  readonly itemId: string;
  readonly maxDelayMs?: number;
  readonly onRetry?: (input: { readonly attempt: number; readonly delayMs: number }) => void;
  readonly sessionId: string;
  readonly store: Pick<AgentMailboxStore, "commit">;
}): Promise<AgentMailboxItem> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  assertPositiveInteger(attempts, "attempts", 12);
  assertPositiveInteger(baseDelayMs, "baseDelayMs", 10_000);
  assertPositiveInteger(maxDelayMs, "maxDelayMs", 30_000);
  if (maxDelayMs < baseDelayMs) throw new Error("maxDelayMs must be at least baseDelayMs.");

  const delay = options.delay ?? ((milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await options.store.commit(options.itemId, options.sessionId);
    } catch {
      if (attempt === attempts) {
        throw new Error(
          `Mailbox commit confirmation remained unavailable after ${attempts} attempts.`,
        );
      }
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      options.onRetry?.({ attempt, delayMs });
      await delay(delayMs);
    }
  }
  throw new Error("Mailbox commit confirmation did not run.");
}

function assertPositiveInteger(value: number, name: string, maximum: number): void {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer from 1 to ${maximum}.`);
  }
}
