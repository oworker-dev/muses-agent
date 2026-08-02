export const EVE_DOCKER_SANDBOX_LABEL = "eve.sandbox";
export const EVE_DOCKER_SANDBOX_ROLE_LABEL = "eve.sandbox.role";
export const EVE_DOCKER_SANDBOX_SESSION_LABEL = "eve.sandbox.tag.sessionId";

const SESSION_CONTAINER_NAME = /^eve-sbx-ses-docker-[a-zA-Z0-9_.-]+$/;

export type DockerSandboxContainer = {
  readonly id: string;
  readonly name: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly running: boolean;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
};

export type DockerSandboxRetentionPolicy = {
  readonly nowMs: number;
  readonly retentionHours: number;
  readonly maxRemovals: number;
  readonly includeRunning: boolean;
  readonly sessionId?: string;
  readonly protectedSessionIds: ReadonlySet<string>;
};

export type DockerSandboxRetentionCandidate = {
  readonly container: DockerSandboxContainer;
  readonly idleHours: number;
  readonly lastLifecycleAt: string;
  readonly sessionId: string;
};

export type DockerSandboxRetentionSkipReason =
  | "invalid-lifecycle"
  | "max-removals"
  | "not-expired"
  | "not-owned"
  | "protected"
  | "running"
  | "session-mismatch";

export type DockerSandboxRetentionSelection = {
  readonly candidates: readonly DockerSandboxRetentionCandidate[];
  readonly skipped: readonly {
    readonly container: DockerSandboxContainer;
    readonly reason: DockerSandboxRetentionSkipReason;
  }[];
};

export function selectDockerSandboxRetentionCandidates(
  containers: readonly DockerSandboxContainer[],
  policy: DockerSandboxRetentionPolicy,
): DockerSandboxRetentionSelection {
  assertPolicy(policy);

  const eligible: DockerSandboxRetentionCandidate[] = [];
  const skipped: Array<{
    container: DockerSandboxContainer;
    reason: DockerSandboxRetentionSkipReason;
  }> = [];
  const retentionMs = policy.retentionHours * 60 * 60 * 1_000;

  for (const container of containers) {
    const sessionId = ownedSessionId(container);
    if (!sessionId) {
      skipped.push({ container, reason: "not-owned" });
      continue;
    }
    if (policy.sessionId && sessionId !== policy.sessionId) {
      skipped.push({ container, reason: "session-mismatch" });
      continue;
    }
    if (policy.protectedSessionIds.has(sessionId)) {
      skipped.push({ container, reason: "protected" });
      continue;
    }
    if (container.running && !(policy.includeRunning && policy.sessionId === sessionId)) {
      skipped.push({ container, reason: "running" });
      continue;
    }

    const lastLifecycleMs = latestLifecycleTime(container);
    if (lastLifecycleMs === undefined) {
      skipped.push({ container, reason: "invalid-lifecycle" });
      continue;
    }
    if (policy.nowMs - lastLifecycleMs < retentionMs) {
      skipped.push({ container, reason: "not-expired" });
      continue;
    }

    eligible.push({
      container,
      idleHours: Math.max(0, policy.nowMs - lastLifecycleMs) / (60 * 60 * 1_000),
      lastLifecycleAt: new Date(lastLifecycleMs).toISOString(),
      sessionId,
    });
  }

  eligible.sort((left, right) => {
    const byLifecycle = left.lastLifecycleAt.localeCompare(right.lastLifecycleAt);
    return byLifecycle || left.container.name.localeCompare(right.container.name);
  });

  for (const candidate of eligible.slice(policy.maxRemovals)) {
    skipped.push({ container: candidate.container, reason: "max-removals" });
  }

  return {
    candidates: eligible.slice(0, policy.maxRemovals),
    skipped,
  };
}

export function ownedSessionId(container: DockerSandboxContainer): string | undefined {
  if (container.labels[EVE_DOCKER_SANDBOX_LABEL] !== "1") return undefined;
  if (container.labels[EVE_DOCKER_SANDBOX_ROLE_LABEL] !== "session") return undefined;
  if (!SESSION_CONTAINER_NAME.test(container.name)) return undefined;
  return container.labels[EVE_DOCKER_SANDBOX_SESSION_LABEL]?.trim() || undefined;
}

function latestLifecycleTime(container: DockerSandboxContainer): number | undefined {
  const times = [container.createdAt, container.startedAt, container.finishedAt]
    .map(parseLifecycleTime)
    .filter((value): value is number => value !== undefined);
  return times.length ? Math.max(...times) : undefined;
}

function parseLifecycleTime(value: string | undefined): number | undefined {
  if (!value || value.startsWith("0001-01-01")) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function assertPolicy(policy: DockerSandboxRetentionPolicy): void {
  if (!Number.isFinite(policy.nowMs)) throw new Error("nowMs must be finite.");
  if (!Number.isFinite(policy.retentionHours) || policy.retentionHours < 0) {
    throw new Error("retentionHours must be a non-negative number.");
  }
  if (!Number.isInteger(policy.maxRemovals) || policy.maxRemovals < 1) {
    throw new Error("maxRemovals must be a positive integer.");
  }
  if (policy.includeRunning && !policy.sessionId) {
    throw new Error("includeRunning requires an exact sessionId.");
  }
}
