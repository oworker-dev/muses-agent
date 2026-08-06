const endpoint = new URL(
  "/api/internal/agent-mailbox/dispatch?limit=20",
  required("AGENT_WEB_INTERNAL_URL"),
);
const secret = required("AGENT_MAILBOX_WORKER_SECRET");
const intervalMs = boundedInteger("AGENT_MAILBOX_WORKER_INTERVAL_MS", 1_000, 250, 60_000);
let stopped = false;
let failureDelayMs = intervalMs;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopped = true;
  });
}

while (!stopped) {
  try {
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${secret}` },
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Mailbox dispatcher returned HTTP ${response.status}.`);
    }
    failureDelayMs = intervalMs;
    await delay(intervalMs);
  } catch (error) {
    if (stopped) break;
    console.error(error instanceof Error ? error.message : "Mailbox dispatcher failed.");
    await delay(failureDelayMs);
    failureDelayMs = Math.min(30_000, failureDelayMs * 2);
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
