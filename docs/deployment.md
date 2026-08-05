# Self-hosted Deployment Runbook

This runbook describes the supported self-hosted alpha topology. It does not
claim that an unverified deployment is production-ready.

## Topology

Run Agent Web and Eve Runtime as separate Node.js 24 processes. Use three
separate state boundaries:

1. Host product data may contain the `open_agent` product schema for thread,
   ownership, AgentRun, extension, and deletion-authorization records.
2. Eve must use a physically separate PostgreSQL database for its Workflow
   World. A schema or queue prefix is not enough to isolate incompatible
   Workflow runtime generations.
3. Each Muses host deployment keeps its own Workflow World database outside the
   Eve database.

Use a unique `WORKFLOW_POSTGRES_JOB_PREFIX` for every World. The supported Eve
prefix is `open_agent_`; the Muses host uses `muses_` in its own database.

## Preflight

Pin the exact source revision and container digest. Load secrets from the target
secret manager, then run:

```bash
npm ci
npm run verify:ci
npm run doctor:production
```

The doctor must pass in the same environment used for the build. In particular,
`AGENT_EMBED_ALLOWED_ORIGINS` and `EVE_NEXT_PRODUCTION_PORT` are build inputs.
The standard build checks the generated route manifest and fails unless
`/embed` contains those exact frame ancestors. Keep this artifact check in the
release pipeline; a healthy standalone page does not prove Host embedding works.
`AGENT_PUBLIC_BASE_URL` and `AGENT_PREVIEW_SIGNING_SECRET` are mandatory in
production. The former must be a public HTTPS origin without a path; the latter
must be at least 32 bytes. They sign expiring website-preview and artifact links.
The filesystem preview/artifact stores are local-development fallbacks and must
not be used by a production deployment; `AGENT_DATABASE_URL` is required.
`AGENT_SANDBOX_IMAGE` must also be an immutable OCI digest. Build the repository
`sandbox/Dockerfile`, publish it to the deployment registry, and run
`npm run verify:sandbox-runtime` against that exact digest. The gate verifies
Node/npm, Python, Git, FFmpeg, ImageMagick, and Playwright/Chromium without
network access.
Do not continue when the doctor reports a shared Workflow database, implicit
sandbox backend, missing telemetry, test fixture model, or disabled Shell
approval.

Bootstrap each database once and run product migrations before accepting
traffic:

```bash
WORKFLOW_POSTGRES_URL=postgres://... npx --package=@workflow/world-postgres bootstrap
AGENT_DATABASE_URL=postgres://... npm run db:migrate
```

Build and start Eve before Agent Web. The complete environment example and
commands are in the root README. Health checks must verify the Eve health route,
the Agent Web route, PostgreSQL connectivity, and telemetry export.

## User-visible delivery

The supported first release delivers two bounded result types:

- `publish_preview` copies a completed static website from `/workspace` into
  PostgreSQL and returns a signed URL to its entrypoint and static assets.
- `publish_artifact` copies one completed file (up to 25 MiB) and returns a
  signed URL suitable for a Python result, image, audio/video render, PDF,
  archive, or other generated output.

Both records are scoped to the authenticated tenant, principal, and Eve
session. URLs are bearer links and expire according to
`AGENT_PREVIEW_TTL_SECONDS`; the raw sandbox filesystem and arbitrary ports are
never exposed. Long-running dev servers and WebSocket previews require the
future Preview Gateway release gate described in the architecture document.

For a Muses-hosted deployment, configure the Agent's OpenAI-compatible client
against the private Host broker:

```bash
OPENAI_API_KEY="$MUSES_AGENT_PROVIDER_BROKER_SECRET"
OPENAI_BASE_URL="https://muses.example.com/api/internal/agent-provider/v1"
```

The same-host self-hosted topology may use the loopback Muses origin over HTTP;
non-loopback origins must use HTTPS. The broker secret is a service credential,
not a model Provider key. Rotate it independently and never expose it to Web UI
configuration, session state, tools, Skills, MCP connections, or sandboxes.
Muses must have an active `llm` Provider Connection whose allowlist accepts the
selected `AGENT_MODEL_ID`. A healthy Agent process with no such connection is
not a successful production preflight.

Set `AGENT_MODEL_MAX_OUTPUT_TOKENS` to the maximum output budget for one model
step. The default deployment value is 4096. Keep it distinct from cumulative
session and AgentRun budgets: compatible gateways may reserve or reject quota
from this per-request value before any output is generated.

## Rollout And Rollback

- Deploy an immutable image and record its Git commit, package version, Eve
  version, database migration revision, model catalog, and extension catalog.
- Keep the previous image available. Application rollback is allowed only when
  its database and Workflow spec versions can read all persisted state.
- Stop new traffic before changing a Workflow runtime generation. Never point a
  different Workflow major/spec at an existing World as a rollback shortcut.
- Use canary traffic and compare completion rate, p95 turn latency, provider
  error rate, sandbox allocation failures, cancellation settlement, token/cost
  reconciliation, and queue backlog before promotion.
- Abort rollout on authorization leakage, cross-session sandbox access, lost
  continuation state, unbounded queue growth, or missing audit/telemetry export.

## Data Lifecycle

Thread deletion first retires the Eve durable session and only then writes a
database-authorized sandbox tombstone. Schedule the Docker reaper with bounded
retention and removal limits. Export both the reaper JSON result and tombstone
state to durable audit storage. Container age alone never authorizes deletion.

Define and publish retention periods for thread snapshots, AgentRun events,
extension audits, host invocation audits, Workflow history, telemetry, provider
usage, and backups. A customer deletion request must cover every store and must
produce an auditable completion record. Backup restores must be tested into an
isolated environment without starting workers against production queues.

## Observability And Privacy

Agent Web, Eve, Muses, and the collector must share W3C trace context. Durable
queue work uses Span Links. Dashboards should cover turn and tool latency,
Provider status, queue backlog, cancellation, sandbox allocation/reaping,
token/cache usage, projected cost, and host capability failures.

Keep full prompts and outputs out of spans, logs, and exception stacks. Run the
private-probe verification against the deployed collector before using private
customer content. Configure sampler, retention, access control, and deletion at
the collector; the local mock collector is evidence tooling only.

## Incident Actions

1. Disable affected Host capabilities or revoke the extension version.
2. Stop new Agent turns while preserving databases and queue evidence.
3. Rotate exposed Provider, Host JWT, HMAC, database, and collector credentials.
4. Capture redacted run, trace, deployment, queue, and audit identifiers.
5. Restore service through a reviewed image or configuration rollback.
6. Reconcile provider charges, host credits, unfinished runs, and sandbox state.
7. Record the cause, affected tenants, deletion/notification duties, and a
   regression test before reopening traffic.

The selected production sandbox, MCP OAuth lifecycle, provider billing,
deployed dashboards, SLO/load evidence, abuse controls, and deletion proof are
still release gates tracked in the architecture document.

Run `npm run verify:live-autonomy` first against the staged Agent Web and Eve
deployment. It must complete a real Provider-backed website task, execute
sandbox tools, call `publish_preview`, and read the signed HTML through the
deployment route. Record the run id, duration, Provider model/config revision,
input/output/cache tokens, tool count, preview id, and correlated trace id. A
functional pass with excessive latency or spend is not an SLO pass.

Use `npm run verify:load` against the staged Agent Web and Eve deployment before
traffic promotion. Record its concurrency and p50/p95/max completion latency.
The deterministic local run is a regression baseline; production capacity still
requires the target Provider, database, queue, sandbox backend, autoscaling, and
collector configuration.

Keep Eve pinned to an exact version. Before any cross-minor upgrade, replay
representative persistent sessions against an isolated copy of the Workflow
World and prove migration compatibility. Do not let a new runtime version take
ownership of the production World until that replay gate passes and rollback has
been rehearsed.
