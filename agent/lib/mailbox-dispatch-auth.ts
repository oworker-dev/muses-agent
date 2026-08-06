import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_CLOCK_SKEW_MS = 60_000;

export type MailboxDispatchHeaders = {
  readonly "x-agent-mailbox-signature": string;
  readonly "x-agent-mailbox-timestamp": string;
};

export function signMailboxDispatchBody(
  body: string,
  options: {
    readonly now?: () => number;
    readonly secret?: string;
  } = {},
): MailboxDispatchHeaders {
  const timestamp = String((options.now ?? Date.now)());
  const signature = signatureFor(timestamp, body, resolveSecret(options.secret));
  return {
    "x-agent-mailbox-signature": `sha256=${signature}`,
    "x-agent-mailbox-timestamp": timestamp,
  };
}

export function verifyMailboxDispatchRequest(
  request: Request,
  body: string,
  options: {
    readonly clockSkewMs?: number;
    readonly now?: () => number;
    readonly secret?: string;
  } = {},
): boolean {
  const timestamp = request.headers.get("x-agent-mailbox-timestamp")?.trim();
  const received = request.headers.get("x-agent-mailbox-signature")?.trim();
  if (!timestamp || !received?.startsWith("sha256=")) return false;
  const timestampMs = Number(timestamp);
  const clockSkewMs = options.clockSkewMs ?? DEFAULT_CLOCK_SKEW_MS;
  if (
    !Number.isSafeInteger(timestampMs) ||
    !Number.isInteger(clockSkewMs) ||
    clockSkewMs < 1_000 ||
    Math.abs((options.now ?? Date.now)() - timestampMs) > clockSkewMs
  ) return false;

  const expected = signatureFor(timestamp, body, resolveSecret(options.secret));
  const candidate = received.slice("sha256=".length);
  if (!/^[A-Za-z0-9_-]{43}$/.test(candidate)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}

function signatureFor(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest("base64url");
}

function resolveSecret(value: string | undefined): string {
  const secret = value?.trim() || process.env.AGENT_MAILBOX_DISPATCH_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AGENT_MAILBOX_DISPATCH_SECRET must contain at least 32 bytes.");
  }
  return secret;
}
