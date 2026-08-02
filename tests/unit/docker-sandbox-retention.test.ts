import assert from "node:assert/strict";
import test from "node:test";

import {
  selectDockerSandboxRetentionCandidates,
  type DockerSandboxContainer,
  type DockerSandboxRetentionPolicy,
} from "../../lib/docker-sandbox-retention.ts";

const nowMs = Date.parse("2026-08-02T12:00:00.000Z");
const basePolicy: DockerSandboxRetentionPolicy = {
  includeRunning: false,
  maxRemovals: 50,
  nowMs,
  protectedSessionIds: new Set(),
  retentionHours: 24,
};

test("selects only expired stopped Eve session containers", () => {
  const expired = sandboxContainer({
    finishedAt: "2026-07-30T12:00:00.000Z",
    sessionId: "ses-expired",
  });
  const recent = sandboxContainer({
    finishedAt: "2026-08-02T06:00:00.000Z",
    sessionId: "ses-recent",
  });
  const running = sandboxContainer({
    running: true,
    sessionId: "ses-running",
    startedAt: "2026-07-20T12:00:00.000Z",
  });

  const selection = selectDockerSandboxRetentionCandidates([expired, recent, running], basePolicy);

  assert.deepEqual(selection.candidates.map((candidate) => candidate.sessionId), ["ses-expired"]);
  assert.deepEqual(selection.skipped.map((item) => item.reason).sort(), ["not-expired", "running"]);
});

test("rejects containers outside Eve's exact session ownership boundary", () => {
  const wrongRole = sandboxContainer({ sessionId: "ses-template" });
  const wrongName = sandboxContainer({ sessionId: "ses-name" });
  const missingSession = sandboxContainer({ sessionId: "ses-missing" });
  wrongRole.labels["eve.sandbox.role"] = "template";
  wrongName.name = "customer-container";
  delete missingSession.labels["eve.sandbox.tag.sessionId"];

  const selection = selectDockerSandboxRetentionCandidates(
    [wrongRole, wrongName, missingSession],
    basePolicy,
  );

  assert.equal(selection.candidates.length, 0);
  assert.deepEqual(selection.skipped.map((item) => item.reason), ["not-owned", "not-owned", "not-owned"]);
});

test("honors protection, exact session scope, and maximum removals", () => {
  const first = sandboxContainer({
    finishedAt: "2026-07-28T12:00:00.000Z",
    sessionId: "ses-first",
  });
  const second = sandboxContainer({
    finishedAt: "2026-07-29T12:00:00.000Z",
    sessionId: "ses-second",
  });

  const protectedSelection = selectDockerSandboxRetentionCandidates([first, second], {
    ...basePolicy,
    protectedSessionIds: new Set(["ses-first"]),
  });
  assert.deepEqual(protectedSelection.candidates.map((candidate) => candidate.sessionId), ["ses-second"]);
  assert.equal(protectedSelection.skipped[0]?.reason, "protected");

  const cappedSelection = selectDockerSandboxRetentionCandidates([second, first], {
    ...basePolicy,
    maxRemovals: 1,
  });
  assert.deepEqual(cappedSelection.candidates.map((candidate) => candidate.sessionId), ["ses-first"]);
  assert.ok(cappedSelection.skipped.some((item) => item.reason === "max-removals"));

  const exactSelection = selectDockerSandboxRetentionCandidates([first, second], {
    ...basePolicy,
    sessionId: "ses-second",
  });
  assert.deepEqual(exactSelection.candidates.map((candidate) => candidate.sessionId), ["ses-second"]);
  assert.ok(exactSelection.skipped.some((item) => item.reason === "session-mismatch"));
});

test("requires an exact session before selecting a running container", () => {
  const running = sandboxContainer({
    running: true,
    sessionId: "ses-running",
    startedAt: "2026-07-20T12:00:00.000Z",
  });

  assert.throws(
    () => selectDockerSandboxRetentionCandidates([running], { ...basePolicy, includeRunning: true }),
    /requires an exact sessionId/,
  );

  const selection = selectDockerSandboxRetentionCandidates([running], {
    ...basePolicy,
    includeRunning: true,
    sessionId: "ses-running",
  });
  assert.deepEqual(selection.candidates.map((candidate) => candidate.sessionId), ["ses-running"]);
});

function sandboxContainer(input: {
  finishedAt?: string;
  running?: boolean;
  sessionId: string;
  startedAt?: string;
}): DockerSandboxContainer & { labels: Record<string, string>; name: string } {
  return {
    createdAt: "2026-07-20T12:00:00.000Z",
    finishedAt: input.finishedAt ?? "2026-07-30T12:00:00.000Z",
    id: `container-${input.sessionId}`,
    labels: {
      "eve.sandbox": "1",
      "eve.sandbox.role": "session",
      "eve.sandbox.tag.sessionId": input.sessionId,
    },
    name: `eve-sbx-ses-docker-${input.sessionId}`,
    running: input.running ?? false,
    startedAt: input.startedAt ?? "2026-07-20T12:00:00.000Z",
  };
}
