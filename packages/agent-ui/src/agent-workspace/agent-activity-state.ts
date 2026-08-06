import type { HandleMessageStreamEvent } from "eve/client";
import type { AgentMessages } from "./i18n.js";

export function activityLabel(
  events: readonly HandleMessageStreamEvent[],
  messages: AgentMessages,
  options: {
    readonly mode?: "live" | "recovery";
    readonly mountedAt: number;
    readonly now: number;
  },
): string {
  const last = events.at(-1);
  const lastProgressAt = eventTime(last) ?? options.mountedAt;
  const noProgressMs = Math.max(0, options.now - lastProgressAt);
  if (options.mode === "recovery") {
    return noProgressMs >= 45_000
      ? messages.recoveryConnectionSlow
      : messages.catchingUpDurableRun;
  }
  if (isWaitingForProvider(last)) {
    if (noProgressMs >= 45_000) return messages.providerStillWaiting;
    if (noProgressMs >= 15_000) return messages.providerTakingLonger;
  }
  if (!last || last.type === "session.started" || last.type === "turn.started" || last.type === "message.received") {
    return messages.startingTask;
  }
  if (last.type === "actions.requested") return messages.runningTools;
  if (
    last.type === "step.started" ||
    last.type === "reasoning.appended" ||
    last.type === "reasoning.completed" ||
    last.type === "message.appended" ||
    last.type === "message.completed"
  ) {
    return messages.waitingForModel;
  }
  return messages.agentWorking;
}

function isWaitingForProvider(event: HandleMessageStreamEvent | undefined): boolean {
  return event === undefined ||
    event.type === "session.started" ||
    event.type === "turn.started" ||
    event.type === "message.received" ||
    event.type === "step.started" ||
    event.type === "reasoning.appended" ||
    event.type === "reasoning.completed" ||
    event.type === "message.appended" ||
    event.type === "message.completed";
}

function eventTime(event: HandleMessageStreamEvent | undefined): number | undefined {
  const value = event?.meta?.at;
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
