export function presentAgentTurn(message, events) {
    if (message.role !== "assistant" || !message.metadata?.turnId)
        return undefined;
    const turnId = message.metadata.turnId;
    const turnEvents = eventsForRootTurn(events, turnId);
    const pendingRequests = pendingRequestsForRootTurn(events, turnId);
    const firstAction = turnEvents.find((event) => event.type === "actions.requested");
    const hasTools = firstAction !== undefined || pendingRequests.length > 0 || message.parts.some((part) => part.type === "dynamic-tool");
    if (!hasTools)
        return undefined;
    const terminal = [...turnEvents].reverse().find((event) => event.type === "turn.completed" || event.type === "turn.failed" || event.type === "turn.cancelled");
    const status = pendingRequests.length > 0
        ? "waiting"
        : terminal?.type === "turn.completed"
            ? "completed"
            : terminal?.type === "turn.failed"
                ? "failed"
                : terminal?.type === "turn.cancelled"
                    ? "cancelled"
                    : "running";
    const finalStepIndex = finalDeliveryStepIndex(turnEvents, message, status);
    let finalPart;
    const processParts = [];
    for (const part of message.parts) {
        if (part.type === "step-start")
            continue;
        if (part.type === "text" && part.stepIndex === finalStepIndex) {
            finalPart = part;
            continue;
        }
        processParts.push(part);
    }
    return {
        endedAt: eventTimestamp(terminal),
        finalPart,
        proxiedInputParts: pendingRequests
            .filter((request) => !message.parts.some((part) => part.type === "dynamic-tool" && part.approval?.id === request.requestId))
            .map(toProxiedInputPart),
        processParts,
        startedAt: eventTimestamp(firstAction),
        status,
    };
}
export function isProxiedInputOnlyMessage(message, events) {
    if (message.role !== "assistant" || !message.metadata?.turnId)
        return false;
    const turnId = message.metadata.turnId;
    if (events.some((event) => event.type === "turn.started" && event.data.turnId === turnId)) {
        return false;
    }
    const requests = events.flatMap((event) => event.type === "input.requested" && event.data.turnId === turnId
        ? event.data.requests
        : []);
    if (requests.length === 0)
        return false;
    const requestIds = new Set(requests.map((request) => request.requestId));
    return message.parts.every((part) => part.type === "step-start" ||
        (part.type === "dynamic-tool" && part.approval !== undefined && requestIds.has(part.approval.id)));
}
export function unresolvedInputRequests(events) {
    let pending = new Map();
    let hasRequestedInput = false;
    for (const event of events) {
        if (event.type === "input.requested") {
            hasRequestedInput = true;
            for (const request of event.data.requests)
                pending.set(request.requestId, request);
            continue;
        }
        if (event.type === "turn.started" && hasRequestedInput) {
            pending = new Map();
            hasRequestedInput = false;
            continue;
        }
        if (event.type === "session.completed" || event.type === "session.failed") {
            pending = new Map();
            hasRequestedInput = false;
        }
    }
    return [...pending.values()];
}
export function hasUnresolvedInputRequests(events) {
    return unresolvedInputRequests(events).length > 0;
}
export function eventsBeforeLastUserTurn(events) {
    const lastUserTurnIndex = events.findLastIndex((event) => event.type === "message.received");
    return lastUserTurnIndex < 0 ? [] : events.slice(0, lastUserTurnIndex);
}
export function presentSubagentCall(events, callId) {
    const started = events.find((event) => event.type === "subagent.called" && event.data.callId === callId);
    const completed = [...events].reverse().find((event) => event.type === "subagent.completed" && event.data.callId === callId);
    const result = [...events].reverse().find((event) => event.type === "action.result" &&
        event.data.result.kind === "subagent-result" &&
        event.data.result.callId === callId);
    const owningTurnId = started?.type === "subagent.called" ? started.data.turnId : undefined;
    const parentCancellation = owningTurnId
        ? [...events].reverse().find((event) => event.type === "turn.cancelled" && event.data.turnId === owningTurnId)
        : undefined;
    const terminalSession = [...events].reverse().find((event) => event.type === "session.completed" || event.type === "session.failed");
    if (result?.type === "action.result" && result.data.status !== "completed") {
        return {
            childSessionId: started?.type === "subagent.called" ? started.data.childSessionId : undefined,
            endedAt: eventTimestamp(result),
            name: started?.type === "subagent.called" ? started.data.name : undefined,
            startedAt: eventTimestamp(started),
            status: "failed",
        };
    }
    if (completed || result) {
        return {
            childSessionId: started?.type === "subagent.called" ? started.data.childSessionId : undefined,
            endedAt: eventTimestamp(result ?? completed),
            name: started?.type === "subagent.called" ? started.data.name : undefined,
            startedAt: eventTimestamp(started),
            status: "completed",
        };
    }
    if (parentCancellation?.type === "turn.cancelled") {
        return {
            childSessionId: started?.type === "subagent.called" ? started.data.childSessionId : undefined,
            endedAt: eventTimestamp(parentCancellation),
            name: started?.type === "subagent.called" ? started.data.name : undefined,
            startedAt: eventTimestamp(started),
            status: "cancelled",
        };
    }
    if (terminalSession) {
        return {
            childSessionId: started?.type === "subagent.called" ? started.data.childSessionId : undefined,
            endedAt: eventTimestamp(terminalSession),
            name: started?.type === "subagent.called" ? started.data.name : undefined,
            startedAt: eventTimestamp(started),
            status: "failed",
        };
    }
    if (started?.type !== "subagent.called")
        return { status: "starting" };
    return {
        childSessionId: started.data.childSessionId,
        name: started.data.name,
        startedAt: eventTimestamp(started),
        status: "running",
    };
}
export function presentSubagentSessions(events) {
    const calls = events.flatMap((event) => event.type === "actions.requested"
        ? event.data.actions.filter((action) => action.kind === "subagent-call")
        : []);
    return calls.map((call) => ({
        ...presentSubagentCall(events, call.callId),
        callId: call.callId,
        task: subagentTask(call.input),
    }));
}
function eventsForRootTurn(events, turnId) {
    const start = events.findIndex((event) => event.type === "turn.started" && event.data.turnId === turnId);
    if (start < 0)
        return events.filter((event) => eventTurnId(event) === turnId);
    const next = events.findIndex((event, index) => index > start && event.type === "turn.started");
    return events.slice(start, next < 0 ? undefined : next);
}
function pendingRequestsForRootTurn(events, turnId) {
    const pendingIds = new Set(unresolvedInputRequests(events).map((request) => request.requestId));
    if (pendingIds.size === 0)
        return [];
    return eventsForRootTurn(events, turnId)
        .flatMap((event) => event.type === "input.requested" ? event.data.requests : [])
        .filter((request) => pendingIds.has(request.requestId));
}
function toProxiedInputPart(request) {
    return {
        approval: { id: request.requestId },
        input: request.action.input,
        state: "approval-requested",
        toolCallId: request.action.callId,
        toolMetadata: {
            eve: {
                inputRequest: {
                    allowFreeform: request.allowFreeform,
                    display: request.display,
                    kind: request.kind,
                    options: request.options,
                    prompt: request.prompt,
                    requestId: request.requestId,
                },
                kind: "tool-call",
                name: request.action.toolName,
            },
        },
        toolName: request.action.toolName,
        type: "dynamic-tool",
    };
}
function finalDeliveryStepIndex(events, message, status) {
    const completedDelivery = [...events].reverse().find((event) => event.type === "message.completed" &&
        event.data.message !== null &&
        event.data.finishReason !== "tool-calls");
    if (completedDelivery?.type === "message.completed")
        return completedDelivery.data.stepIndex;
    if (status !== "running")
        return undefined;
    const latestActionStep = events.reduce((latest, event) => event.type === "actions.requested" ? Math.max(latest, event.data.stepIndex) : latest, -1);
    const latestText = [...message.parts].reverse().find((part) => part.type === "text");
    return latestText?.type === "text" && (latestText.stepIndex ?? 0) > latestActionStep
        ? latestText.stepIndex
        : undefined;
}
function eventTurnId(event) {
    if (!("data" in event) || !event.data || typeof event.data !== "object")
        return undefined;
    return "turnId" in event.data && typeof event.data.turnId === "string"
        ? event.data.turnId
        : undefined;
}
function eventTimestamp(event) {
    const timestamp = event?.meta?.at;
    if (!timestamp)
        return undefined;
    const parsed = Date.parse(timestamp);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function subagentTask(input) {
    if (typeof input !== "object" || input === null || Array.isArray(input))
        return undefined;
    const message = "message" in input ? input.message : undefined;
    return typeof message === "string" && message.trim() ? message.trim() : undefined;
}
//# sourceMappingURL=turn-presentation.js.map