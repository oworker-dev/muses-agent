export function activityLabel(events, messages, options) {
    const last = events.at(-1);
    const lastProgressAt = eventTime(last) ?? options.mountedAt;
    const noProgressMs = Math.max(0, options.now - lastProgressAt);
    if (options.mode === "recovery") {
        return noProgressMs >= 45_000
            ? messages.recoveryConnectionSlow
            : messages.catchingUpDurableRun;
    }
    if (isWaitingForProvider(last)) {
        if (noProgressMs >= 45_000)
            return messages.providerStillWaiting;
        if (noProgressMs >= 15_000)
            return messages.providerTakingLonger;
    }
    if (!last || last.type === "session.started" || last.type === "turn.started" || last.type === "message.received") {
        return messages.startingTask;
    }
    if (last.type === "actions.requested")
        return messages.runningTools;
    if (last.type === "step.started" ||
        last.type === "reasoning.appended" ||
        last.type === "reasoning.completed" ||
        last.type === "message.appended" ||
        last.type === "message.completed") {
        return messages.waitingForModel;
    }
    return messages.agentWorking;
}
function isWaitingForProvider(event) {
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
function eventTime(event) {
    const value = event?.meta?.at;
    if (!value)
        return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
//# sourceMappingURL=agent-activity-state.js.map