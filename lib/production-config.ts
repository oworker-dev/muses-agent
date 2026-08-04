export type ProductionDiagnostic = {
  readonly code: string;
  readonly level: "error" | "warning";
  readonly message: string;
};

export type AgentSandboxBackendName = "auto" | "docker" | "microsandbox" | "vercel";

const SANDBOX_BACKENDS = new Set<AgentSandboxBackendName>([
  "auto",
  "docker",
  "microsandbox",
  "vercel",
]);
const EXTENSION_REF = /^[a-z0-9][a-z0-9._-]*@[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/;

export function readAgentSandboxBackend(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentSandboxBackendName {
  const configured = environment.AGENT_SANDBOX_BACKEND?.trim() || "auto";
  if (!SANDBOX_BACKENDS.has(configured as AgentSandboxBackendName)) {
    throw new Error(
      "AGENT_SANDBOX_BACKEND must be one of auto, docker, microsandbox, or vercel.",
    );
  }
  if (environment.NODE_ENV === "production" && configured === "auto") {
    throw new Error(
      "AGENT_SANDBOX_BACKEND must explicitly select docker, microsandbox, or vercel in production.",
    );
  }
  return configured as AgentSandboxBackendName;
}

export function inspectProductionConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
  nodeVersion = process.versions.node,
): readonly ProductionDiagnostic[] {
  const diagnostics: ProductionDiagnostic[] = [];
  const error = (code: string, message: string) => diagnostics.push({ code, level: "error", message });
  const warning = (code: string, message: string) => diagnostics.push({ code, level: "warning", message });

  if (environment.AGENT_EVAL_FIXTURE_MODEL?.trim()) {
    error(
      "eval-fixture-model",
      "AGENT_EVAL_FIXTURE_MODEL is test-only and must not be configured in production.",
    );
  }
  if (environment.AGENT_EVAL_CONTEXT_WINDOW_TOKENS?.trim()) {
    error(
      "eval-context-window",
      "AGENT_EVAL_CONTEXT_WINDOW_TOKENS is test-only and must not be configured in production.",
    );
  }
  if (environment.AGENT_PROVIDER_MODE?.trim() === "mock") {
    error(
      "mock-provider",
      "AGENT_PROVIDER_MODE=mock is test-only and must not be configured in production.",
    );
  }
  try {
    const approvalMode = environment.AGENT_BASH_APPROVAL_MODE?.trim() || "risky";
    if (approvalMode !== "always" && approvalMode !== "risky" && approvalMode !== "never") {
      throw new Error("invalid mode");
    }
    if (approvalMode === "never") {
      error(
        "bash-approval-mode",
        "AGENT_BASH_APPROVAL_MODE=never is not allowed in production.",
      );
    }
  } catch {
    error(
      "bash-approval-mode",
      "AGENT_BASH_APPROVAL_MODE must be always or risky in production.",
    );
  }

  const nodeMajor = Number(nodeVersion.split(".")[0]);
  if (nodeMajor !== 24) {
    error("node-version", `Node.js 24 is required; current version is ${nodeVersion}.`);
  }

  requireValue(environment, "OPENAI_API_KEY", error);
  requireValue(environment, "AGENT_MODEL_MAX_OUTPUT_TOKENS", error);
  requireValue(environment, "AGENT_PROVIDER_HTTP_TIMEOUT_MS", error);
  requireValue(environment, "AGENT_DATABASE_URL", error);
  requireValue(environment, "AGENT_RUNTIME_URL", error);
  requireValue(environment, "AGENT_HOST_JWT_SECRET", error);
  requireValue(environment, "AGENT_HOST_JWT_ISSUER", error);
  requireValue(environment, "AGENT_HOST_JWT_AUDIENCE", error);
  requireValue(environment, "AGENT_EMBED_ALLOWED_ORIGINS", error);
  requireValue(environment, "WORKFLOW_POSTGRES_URL", error);
  requireValue(environment, "WORKFLOW_POSTGRES_JOB_PREFIX", error);

  const telemetryConfigured = Boolean(
    environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim() ||
      environment.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ||
      environment.VERCEL_OTEL_ENDPOINTS?.trim(),
  );
  if (!telemetryConfigured) {
    error(
      "telemetry-exporter",
      "Configure an OTLP traces endpoint or the Vercel OTel collector for production.",
    );
  }
  inspectHttpUrl(
    environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    { allowLoopbackHttp: true },
    error,
  );
  inspectHttpUrl(
    environment.OTEL_EXPORTER_OTLP_ENDPOINT,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    { allowLoopbackHttp: true },
    error,
  );

  const jwtSecret = environment.AGENT_HOST_JWT_SECRET?.trim();
  if (jwtSecret && Buffer.byteLength(jwtSecret) < 32) {
    error("host-jwt-secret", "AGENT_HOST_JWT_SECRET must contain at least 32 bytes.");
  }

  const algorithm = environment.AGENT_HOST_JWT_ALGORITHM?.trim() || "HS256";
  if (algorithm !== "HS256") {
    error("host-jwt-algorithm", "Only AGENT_HOST_JWT_ALGORITHM=HS256 is currently supported.");
  }

  const schema = environment.AGENT_DATABASE_SCHEMA?.trim() || "open_agent";
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema) || schema.toLowerCase() === "workflow") {
    error(
      "agent-database-schema",
      "AGENT_DATABASE_SCHEMA must be a valid non-workflow PostgreSQL schema name.",
    );
  }

  const agentDatabase = postgresDatabaseIdentity(environment.AGENT_DATABASE_URL, "AGENT_DATABASE_URL", error);
  const workflowDatabase = postgresDatabaseIdentity(
    environment.WORKFLOW_POSTGRES_URL,
    "WORKFLOW_POSTGRES_URL",
    error,
  );
  if (agentDatabase && workflowDatabase && agentDatabase === workflowDatabase) {
    error(
      "workflow-world-isolation",
      "The Eve Workflow World must use a physically separate PostgreSQL database from AGENT_DATABASE_URL.",
    );
  }

  if (environment.WORKFLOW_TARGET_WORLD?.trim() !== "@workflow/world-postgres") {
    error(
      "workflow-world",
      "WORKFLOW_TARGET_WORLD must be @workflow/world-postgres for the supported self-hosted production topology.",
    );
  }

  const jobPrefix = environment.WORKFLOW_POSTGRES_JOB_PREFIX?.trim();
  if (jobPrefix === "muses_" || jobPrefix === "workflow_") {
    error(
      "workflow-job-prefix",
      "WORKFLOW_POSTGRES_JOB_PREFIX must not reuse the Muses or default Workflow queue prefix.",
    );
  } else if (jobPrefix && jobPrefix !== "open_agent_") {
    warning(
      "workflow-job-prefix-convention",
      "The verified Muses Agent queue prefix is open_agent_; keep custom prefixes unique per Workflow World.",
    );
  }

  try {
    const backend = readAgentSandboxBackend({ ...environment, NODE_ENV: "production" });
    if (backend === "docker") {
      inspectInteger(
        environment.EVE_SANDBOX_RETENTION_HOURS,
        "EVE_SANDBOX_RETENTION_HOURS",
        1,
        87_600,
        error,
      );
      inspectInteger(
        environment.EVE_SANDBOX_REAPER_MAX_REMOVALS,
        "EVE_SANDBOX_REAPER_MAX_REMOVALS",
        1,
        10_000,
        error,
      );
      warning(
        "sandbox-backend-docker",
        "Docker is selected; production must schedule the sandbox reaper and prove daemon hardening, quotas, and cross-session isolation on the deployed host.",
      );
    }
  } catch (cause) {
    error("sandbox-backend", cause instanceof Error ? cause.message : "Invalid sandbox backend.");
  }

  inspectHttpUrl(environment.AGENT_RUNTIME_URL, "AGENT_RUNTIME_URL", { allowLoopbackHttp: true }, error);
  inspectHttpUrl(environment.OPENAI_BASE_URL, "OPENAI_BASE_URL", { allowLoopbackHttp: true }, error);
  inspectInteger(
    environment.AGENT_MODEL_MAX_OUTPUT_TOKENS,
    "AGENT_MODEL_MAX_OUTPUT_TOKENS",
    256,
    128_000,
    error,
  );
  inspectInteger(
    environment.AGENT_PROVIDER_HTTP_TIMEOUT_MS,
    "AGENT_PROVIDER_HTTP_TIMEOUT_MS",
    1_000,
    900_000,
    error,
  );

  const hostToolsUrl = environment.AGENT_HOST_TOOLS_URL?.trim();
  const hostToolsSecret = environment.AGENT_HOST_TOOLS_SECRET?.trim();
  if (Boolean(hostToolsUrl) !== Boolean(hostToolsSecret)) {
    error(
      "host-tools-pair",
      "AGENT_HOST_TOOLS_URL and AGENT_HOST_TOOLS_SECRET must be configured together.",
    );
  }
  if (hostToolsUrl) {
    inspectHttpUrl(hostToolsUrl, "AGENT_HOST_TOOLS_URL", { allowLoopbackHttp: true }, error);
  }
  if (hostToolsSecret && Buffer.byteLength(hostToolsSecret) < 32) {
    error("host-tools-secret", "AGENT_HOST_TOOLS_SECRET must contain at least 32 bytes.");
  }

  inspectFrameOrigins(environment.AGENT_EMBED_ALLOWED_ORIGINS, error);
  inspectInteger(environment.EVE_NEXT_PRODUCTION_PORT, "EVE_NEXT_PRODUCTION_PORT", 1, 65_535, error);
  inspectInteger(
    environment.WORKFLOW_POSTGRES_WORKER_CONCURRENCY,
    "WORKFLOW_POSTGRES_WORKER_CONCURRENCY",
    1,
    1_000,
    error,
  );
  inspectInteger(
    environment.WORKFLOW_POSTGRES_MAX_POOL_SIZE,
    "WORKFLOW_POSTGRES_MAX_POOL_SIZE",
    1,
    1_000,
    error,
  );

  const revoked = environment.AGENT_REVOKED_EXTENSIONS?.trim();
  if (revoked) {
    for (const reference of revoked.split(",").map((value) => value.trim())) {
      if (!EXTENSION_REF.test(reference)) {
        error(
          "revoked-extension-ref",
          `AGENT_REVOKED_EXTENSIONS contains invalid version-pinned reference ${JSON.stringify(reference)}.`,
        );
      }
    }
  }

  return diagnostics;
}

function requireValue(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
  error: (code: string, message: string) => void,
): void {
  if (!environment[name]?.trim()) {
    error("missing-required", `${name} is required for production.`);
  }
}

function postgresDatabaseIdentity(
  value: string | undefined,
  name: string,
  error: (code: string, message: string) => void,
): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("unsupported protocol");
    }
    const database = url.pathname.replace(/^\/+/, "");
    if (!url.hostname || !database) throw new Error("missing host or database");
    const port = url.port || "5432";
    return `${url.hostname.toLowerCase()}:${port}/${database}`;
  } catch {
    error("postgres-url", `${name} must be a PostgreSQL URL containing an explicit database name.`);
    return undefined;
  }
}

function inspectHttpUrl(
  value: string | undefined,
  name: string,
  options: { readonly allowLoopbackHttp: boolean },
  error: (code: string, message: string) => void,
): void {
  if (!value?.trim()) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
    if (url.protocol !== "https:" && !(options.allowLoopbackHttp && loopback)) {
      error("insecure-url", `${name} must use HTTPS outside an explicit loopback topology.`);
    }
  } catch {
    error("http-url", `${name} must be an absolute HTTP(S) URL.`);
  }
}

function inspectFrameOrigins(
  value: string | undefined,
  error: (code: string, message: string) => void,
): void {
  if (!value?.trim()) return;
  const origins = value.split(",").map((origin) => origin.trim());
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
      if (url.origin !== origin || (url.protocol !== "https:" && !loopback)) {
        throw new Error("origin");
      }
    } catch {
      error(
        "embed-origin",
        `AGENT_EMBED_ALLOWED_ORIGINS contains invalid exact origin ${JSON.stringify(origin)}.`,
      );
    }
  }
}

function inspectInteger(
  value: string | undefined,
  name: string,
  minimum: number,
  maximum: number,
  error: (code: string, message: string) => void,
): void {
  if (!value?.trim()) {
    error("missing-required", `${name} is required for production.`);
    return;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    error("integer-range", `${name} must be an integer from ${minimum} to ${maximum}.`);
  }
}
