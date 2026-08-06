import assert from "node:assert/strict";
import test from "node:test";

import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import { activityLabel } from "../../packages/agent-ui/src/agent-workspace/agent-activity-state.ts";
import { messagesFor } from "../../packages/agent-ui/src/agent-workspace/i18n.ts";
import {
  hasUnresolvedInputRequests,
  isProxiedInputOnlyMessage,
  presentAgentTurn,
  presentSubagentCall,
  presentSubagentSessions,
} from "../../packages/agent-ui/src/agent-workspace/turn-presentation.ts";
import { summarizeUsage } from "../../packages/agent-ui/src/agent-workspace/usage.ts";

const startedAt = "2026-08-06T01:00:00.000Z";
const endedAt = "2026-08-06T01:00:09.000Z";

test("plain assistant replies remain normal dialogue without a task execution group", () => {
  const message: EveMessage = {
    id: "turn-chat:assistant",
    metadata: { status: "complete", turnId: "turn-chat" },
    parts: [{ state: "done", stepIndex: 0, text: "Hello", type: "text" }],
    role: "assistant",
  };

  assert.equal(presentAgentTurn(message, []), undefined);
});

test("tool turns separate the execution process from the final delivery", () => {
  const message: EveMessage = {
    id: "turn-task:assistant",
    metadata: { status: "complete", turnId: "turn-task" },
    parts: [
      { type: "step-start" },
      { state: "done", stepIndex: 0, text: "Inspecting the workspace.", type: "text" },
      {
        input: { command: "find . -maxdepth 2 -type f" },
        output: "./package.json",
        state: "output-available",
        stepIndex: 0,
        toolCallId: "call-1",
        toolName: "bash",
        type: "dynamic-tool",
      },
      { type: "step-start" },
      { state: "done", stepIndex: 1, text: "The website is ready.", type: "text" },
    ],
    role: "assistant",
  };
  const events = [
    event("actions.requested", startedAt, {
      actions: [{ callId: "call-1", input: { command: "find ." }, kind: "tool-call", toolName: "bash" }],
      sequence: 0,
      stepIndex: 0,
      turnId: "turn-task",
    }),
    event("message.completed", endedAt, {
      finishReason: "stop",
      message: "The website is ready.",
      sequence: 0,
      stepIndex: 1,
      turnId: "turn-task",
    }),
    event("turn.completed", endedAt, { sequence: 0, turnId: "turn-task" }),
  ];

  const presentation = presentAgentTurn(message, events);
  assert.ok(presentation);
  assert.equal(presentation.status, "completed");
  assert.equal(presentation.startedAt, Date.parse(startedAt));
  assert.equal(presentation.endedAt, Date.parse(endedAt));
  assert.equal(presentation.finalPart?.text, "The website is ready.");
  assert.deepEqual(presentation.processParts.map((part) => part.type), ["text", "dynamic-tool"]);
});

test("a proxied child approval keeps its parent task visibly waiting", () => {
  const parent: EveMessage = {
    id: "turn-parent:assistant",
    metadata: { status: "complete", turnId: "turn-parent" },
    parts: [{
      input: { message: "Build the stylesheet" },
      state: "input-available",
      stepIndex: 0,
      toolCallId: "call-agent",
      toolMetadata: { eve: { kind: "subagent-call", name: "agent" } },
      toolName: "agent",
      type: "dynamic-tool",
    }],
    role: "assistant",
  };
  const child: EveMessage = {
    id: "turn-child:assistant",
    metadata: { status: "streaming", turnId: "turn-child" },
    parts: [
      { type: "step-start" },
      approvalPart("request-child", "call-bash"),
    ],
    role: "assistant",
  };
  const events = childApprovalEvents();

  const presentation = presentAgentTurn(parent, events);
  assert.ok(presentation);
  assert.equal(presentation.status, "waiting");
  assert.equal(presentation.proxiedInputParts.length, 1);
  assert.equal(presentation.proxiedInputParts[0]?.approval?.id, "request-child");
  assert.equal(hasUnresolvedInputRequests(events), true);
  assert.equal(isProxiedInputOnlyMessage(child, events), true);
});

test("subagent lifecycle stays distinct from generic provider waiting", () => {
  const running = childApprovalEvents().slice(0, 3);
  assert.deepEqual(presentSubagentCall(running, "call-agent"), {
    childSessionId: "child-session",
    name: "agent",
    startedAt: Date.parse(startedAt),
    status: "running",
  });

  const completed = [
    ...running,
    event("subagent.completed", endedAt, {
      callId: "call-agent",
      output: "Stylesheet complete",
      subagentName: "agent",
    }),
  ];
  assert.deepEqual(presentSubagentCall(completed, "call-agent"), {
    childSessionId: "child-session",
    endedAt: Date.parse(endedAt),
    name: "agent",
    startedAt: Date.parse(startedAt),
    status: "completed",
  });
  assert.deepEqual(presentSubagentCall([], "call-pending"), { status: "starting" });
});

test("a cancelled parent turn stops orphaned subagent timers", () => {
  const running = childApprovalEvents().slice(0, 3);
  const cancelledAt = "2026-08-06T01:00:12.000Z";
  const events = [
    ...running,
    event("turn.cancelled", cancelledAt, { sequence: 0, turnId: "turn-parent" }),
    event("session.waiting", cancelledAt, { continuationToken: "continue-parent", wait: "next-user-message" }),
  ];

  assert.deepEqual(presentSubagentCall(events, "call-agent"), {
    childSessionId: "child-session",
    endedAt: Date.parse(cancelledAt),
    name: "agent",
    startedAt: Date.parse(startedAt),
    status: "cancelled",
  });
  assert.deepEqual(presentSubagentSessions(events), [{
    callId: "call-agent",
    childSessionId: "child-session",
    endedAt: Date.parse(cancelledAt),
    name: "agent",
    startedAt: Date.parse(startedAt),
    status: "cancelled",
    task: "Build the stylesheet",
  }]);
});

test("the next root turn resolves a proxied child approval", () => {
  const events = [
    ...childApprovalEvents(),
    event("turn.started", "2026-08-06T01:00:10.000Z", { sequence: 1, turnId: "turn-next" }),
  ];
  assert.equal(hasUnresolvedInputRequests(events), false);

  const parent: EveMessage = {
    id: "turn-parent:assistant",
    metadata: { status: "complete", turnId: "turn-parent" },
    parts: [approvalPart("request-child", "call-bash")],
    role: "assistant",
  };
  assert.equal(presentAgentTurn(parent, events)?.status, "completed");
});

test("a root approval is not rendered twice", () => {
  const message: EveMessage = {
    id: "turn-parent:assistant",
    metadata: { status: "complete", turnId: "turn-parent" },
    parts: [approvalPart("request-root", "call-bash")],
    role: "assistant",
  };
  const events = [
    event("turn.started", startedAt, { sequence: 0, turnId: "turn-parent" }),
    inputRequested("turn-parent", "request-root", "call-bash"),
    event("turn.completed", endedAt, { sequence: 0, turnId: "turn-parent" }),
    event("session.waiting", endedAt, { continuationToken: "continue-root", wait: "next-user-message" }),
  ];
  const presentation = presentAgentTurn(message, events);
  assert.ok(presentation);
  assert.equal(presentation.status, "waiting");
  assert.equal(presentation.processParts.length, 1);
  assert.equal(presentation.proxiedInputParts.length, 0);
});

test("slow model and recovery labels communicate durable progress honestly", () => {
  const messages = messagesFor("en");
  const events = [event("step.started", startedAt, { sequence: 0, stepIndex: 0, turnId: "turn-task" })];
  const base = Date.parse(startedAt);
  assert.equal(activityLabel(events, messages, { mountedAt: base, now: base + 16_000 }), messages.providerTakingLonger);
  assert.equal(activityLabel(events, messages, { mountedAt: base, now: base + 46_000 }), messages.providerStillWaiting);
  assert.equal(activityLabel(events, messages, { mode: "recovery", mountedAt: base, now: base + 10_000 }), messages.catchingUpDurableRun);
  assert.equal(activityLabel(events, messages, { mode: "recovery", mountedAt: base, now: base + 46_000 }), messages.recoveryConnectionSlow);
});

test("context usage moves during a streamed step and reconciles to Provider usage", () => {
  const initial = [
    event("step.completed", startedAt, {
      finishReason: "tool-calls",
      sequence: 0,
      stepIndex: 0,
      turnId: "turn-task",
      usage: { inputTokens: 1_000, outputTokens: 200 },
    }),
  ];
  const streaming = [
    ...initial,
    event("message.appended", endedAt, {
      messageDelta: "x".repeat(80),
      messageSoFar: "x".repeat(80),
      sequence: 0,
      stepIndex: 1,
      turnId: "turn-task",
    }),
  ];

  assert.deepEqual(summarizeUsage(initial), {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    contextInputTokens: 1_200,
    costUsd: 0,
    inputTokens: 1_000,
    isEstimated: false,
    outputTokens: 200,
    steps: 1,
  });
  const live = summarizeUsage(streaming);
  assert.equal(live.contextInputTokens, 1_220);
  assert.equal(live.outputTokens, 220);
  assert.equal(live.isEstimated, true);

  const reconciled = summarizeUsage([
    ...streaming,
    event("step.completed", endedAt, {
      finishReason: "stop",
      sequence: 0,
      stepIndex: 1,
      turnId: "turn-task",
      usage: { inputTokens: 1_250, outputTokens: 30 },
    }),
  ]);
  assert.equal(reconciled.contextInputTokens, 1_280);
  assert.equal(reconciled.outputTokens, 230);
  assert.equal(reconciled.isEstimated, false);
});

function event(
  type: HandleMessageStreamEvent["type"],
  at: string,
  data: Record<string, unknown>,
): HandleMessageStreamEvent {
  return { data, meta: { at }, type } as HandleMessageStreamEvent;
}

function childApprovalEvents(): HandleMessageStreamEvent[] {
  return [
    event("turn.started", startedAt, { sequence: 0, turnId: "turn-parent" }),
    event("actions.requested", startedAt, {
      actions: [{ callId: "call-agent", input: { message: "Build the stylesheet" }, kind: "subagent-call", name: "agent" }],
      sequence: 0,
      stepIndex: 0,
      turnId: "turn-parent",
    }),
    event("subagent.called", startedAt, {
      callId: "call-agent",
      childSessionId: "child-session",
      name: "agent",
      sequence: 0,
      sessionId: "parent-session",
      toolName: "agent",
      turnId: "turn-parent",
      workflowId: "child-workflow",
    }),
    inputRequested("turn-child", "request-child", "call-bash"),
    event("turn.completed", endedAt, { sequence: 0, turnId: "turn-parent" }),
    event("session.waiting", endedAt, { continuationToken: "continue-parent", wait: "next-user-message" }),
  ];
}

function inputRequested(turnId: string, requestId: string, callId: string): HandleMessageStreamEvent {
  return event("input.requested", endedAt, {
    requests: [{
      action: { callId, input: { command: "npm test && rm -f /tmp/test-output" }, kind: "tool-call", toolName: "bash" },
      display: "confirmation",
      options: [
        { id: "approve", label: "Approve", style: "primary" },
        { id: "deny", label: "Deny", style: "danger" },
      ],
      prompt: "Allow this terminal command?",
      requestId,
    }],
    sequence: 0,
    stepIndex: 0,
    turnId,
  });
}

function approvalPart(requestId: string, callId: string): EveMessage["parts"][number] {
  return {
    approval: { id: requestId },
    input: { command: "npm test && rm -f /tmp/test-output" },
    state: "approval-requested",
    stepIndex: 0,
    toolCallId: callId,
    toolMetadata: {
      eve: {
        inputRequest: {
          display: "confirmation",
          options: [
            { id: "approve", label: "Approve", style: "primary" },
            { id: "deny", label: "Deny", style: "danger" },
          ],
          prompt: "Allow this terminal command?",
          requestId,
        },
        kind: "tool-call",
        name: "bash",
      },
    },
    toolName: "bash",
    type: "dynamic-tool",
  };
}
