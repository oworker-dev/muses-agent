# Architecture

## Product boundary

`open-agent` is a general-purpose autonomous Agent product and integration
kernel. It must be able to run without Muses and must not encode a canvas,
presentation, image, video, music, or workflow-specific execution sequence.

The system is split into three ownership layers:

1. **Agent runtime**: Eve session durability, model loop, tools, skills,
   connections, approvals, sandbox, subagents, limits, and compaction.
2. **Agent Web client**: session list, conversation projection, composer,
   reasoning and tool UI, usage, cancellation, recovery, and localization.
3. **Host adapter**: authentication, account storage, entitlement and billing,
   host tools, client context, branding, and navigation supplied by Muses or any
   future host.

Canvas control belongs to layer 3. Muses can expose canvas query, patch, run, and
approval tools to the Agent. The Agent core must remain useful when those tools
do not exist.

## Result delivery boundary

User-visible results leave a session only through an authenticated publication
tool. `publish_preview` is for a completed static website: it enumerates a
bounded `/workspace` tree, requires an entrypoint, and stores immutable files.
`publish_artifact` is for one bounded output file such as a Python report,
image, audio/video render, PDF, archive, or build log. Both use PostgreSQL in
production, retain tenant/principal/session ownership, and return HMAC-signed
links with a finite TTL. A bearer link is not an authorization substitute for
the Agent APIs; it can be revoked by expiry or database deletion and never
reveals the underlying sandbox path.

This release intentionally supports static result delivery only. It does not
claim that `npm run dev`, a Python HTTP server, a WebSocket process, or any
arbitrary sandbox port is publicly reachable. A Preview Gateway remains a
separate release gate: it must own process registration, health checks, port
mapping, idle shutdown, WebSocket/HTTP proxying, sandbox restart behavior,
tenant/session authorization, and abuse limits before dynamic previews are
enabled.

## Durable session contract

One Web thread maps to one Eve durable session. The session is the isolation and
continuation boundary; a user, account, project, or canvas may own many sessions.
Do not use user-wide or canvas-wide state as the implicit Agent history.

Eve exposes two different handles:

- `sessionId` attaches to the durable event stream;
- `continuationToken` submits the next turn after `session.waiting`.

`turn.completed` is not a safe continuation boundary. A client may submit the
next turn only after `session.waiting`. Terminal alternatives are
`session.completed` and `session.failed`.

The authoritative browser event cursor is the number of persisted server stream
events. During an active request, Eve's serialized session cursor can lag those
events. Hard-refresh recovery therefore starts at `savedEvents.length`, consumes
one reconnecting `session.stream()` flow, and stops at a session boundary.

The reference app stores thread data in `localStorage` through the default
`AgentThreadStorage`. That is a UX cache, not production persistence. Hosts can
inject an authenticated database adapter without forking the workspace; writes
are serialized and retain the same versioned `{ events, session }` snapshot
contract. The bundled PostgreSQL adapter scopes every collection by verified
`tenantId + principalId + storageKey`, increments a server revision, and requires
`If-Match` on replacement. Conflicts are surfaced as `409`; the Web workspace
blocks further writes and displays a reload action instead of silently merging
or overwriting another client's state.

## Headless AgentRun contract

The public host boundary has two independent projections:

- `AgentWorkspace` is the reusable Web UI projection over Eve sessions.
- `AgentRunClient` (exported from `@oworker/open-agent-client`) is the headless service
  projection used by servers and durable Workflow steps.

Both use the same Host JWT identity. Neither interface imports Muses domain
types, owns host billing, or gives browser-supplied metadata authorization
meaning. Eve session and continuation identifiers remain internal harness
details behind stable AgentRun ids and events.

`open-agent` exposes a host-facing run API without making hosts depend on Eve's
session protocol. `runId` is the durable public identity; Eve `sessionId` and
`continuationToken` remain internal harness handles. The API currently supports
start, inspection, incremental event reads, and cancellation under the draft
contract version `0.1.0-draft`.

Start is reserved in PostgreSQL before Eve submission. The unique scope is
`tenantId + principalId + idempotencyKey`, and the request fingerprint excludes
transport-only correlation and idempotency fields. A replay never submits a
second model turn. A network or 5xx outcome during submission is recorded as
`submission-ambiguous` and is never automatically retried; a definitive Eve
4xx rejection is recorded as `failed`.

Parent lineage is explicit and bounded to depth eight. Only service principals
may submit child runs, and the referenced parent, depth, and root run are
validated against the same tenant and principal. This keeps Workflow and Agent
delegation auditable without giving an ordinary user an implicit child-run
authority.

The event endpoint uses a non-negative cursor and projects Eve's stream into a
framework-neutral event union. PostgreSQL stores the latest status, result,
failure, event count, and usage projection. `inputTokens`, `outputTokens`,
`cacheReadTokens`, `cacheWriteTokens`, and `costUsd` are preserved when the
runtime provides them. Cancellation first records `cancellationRequestedAt`
after Eve accepts the cooperative request. The service consumes the stream for
a bounded grace period; a normal `turn.cancelled` boundary wins without further
action. If Eve does not settle, the service uses the stored continuation token
to terminally reset that Headless AgentRun's exclusive durable session and then
atomically marks the run cancelled. Projection freezes ordinary completed or
failed terminal states while cancellation is pending, so late provider output
can contribute usage but cannot publish a result or reverse user intent.
Inspection and event reads run the same idempotent reconciliation to recover an
interrupted cancellation request. A `no_active_turn` response is synchronized
first so a turn that completed before the stop request remains completed.

The API is deliberately not a billing ledger. Per-run credit reservation,
provider pricing reconciliation, deployed trace retention, and deletion policies
must be added before the Muses adapter can be promoted from integration preview.

## Host Capability protocol

Host capabilities are a separate contract from AgentRun transport. The Agent
discovers a versioned descriptor list and invokes only registered names through
`host_capabilities` and `host_invoke`. Both tools are dynamically absent when a
host bridge is not configured. This preserves standalone behavior and prevents
Muses concepts from becoming Agent compile-time dependencies.

The bridge signs timestamp, method, path, and body with a shared HMAC secret.
Muses then verifies replay age, signature, tenant membership, actor type,
Workspace role, and authoritative Project scope before dispatching into its
operation gateway. The raw JWT subject, not Eve's issuer-qualified principal
identifier, is used for Muses membership checks. Viewer actors can discover and
read but cannot mutate or invoke external capabilities. Every invocation uses
the Eve tool call id as its idempotency correlation.

The first capability set covers canvas inspection/placement, one real
`image.generate` media operation, and Workflow list/inspect/invoke/draft/validate/publish.
The image capability performs the durable Muses Workflow, persists the Asset,
and places it through the Operation Gateway before returning. Agent profiles are independently
versioned: `general-purpose@0.1.0` remains host-neutral and
`muses-platform@0.1.0` carries Muses host behavior. A Workflow `agent-run` node
stores only the profile ref, schemas, permissions, budget, and output mode; Eve
session identifiers and provider details stay outside the Workflow DSL.

The Agent Host capability client defaults to a bounded 120-second request
timeout, which covers the current synchronous image generation slice while
remaining below the public 120-second maximum. Video, music, and other longer
media operations must use an accepted durable operation plus a server-side wait
or continuation instead of increasing this timeout without bound.

Eve's Workflow spec 5 World is a separate infrastructure boundary from the
Muses Workflow spec 4 World. They must use different PostgreSQL databases, not
merely different application schemas: both runtimes own the `workflow` schema
and background queue, and a shared database can replay runs with an incompatible
runtime generation. Agent product records may still live in the Muses database
under `open_agent`; only the durable Workflow World is physically isolated.

## Model routing

The browser sends validated model and reasoning preferences as channel headers.
The Eve channel projects those values into authenticated session attributes; a
dynamic model resolver reads them at each `step.started` event.

The installed Eve 0.27.8 ToolLoopAgent path does not reliably apply dynamic
`modelOptions` to every provider call. The model is therefore wrapped with AI SDK
`defaultSettingsMiddleware` so OpenAI Responses always receives the effective
reasoning setting and `store: false`.

`store: false` is required because Eve owns durable history and the configured
OpenAI-compatible endpoint may not persist response items. Relying on
`previous_response_id` produced multi-turn `Item not found` failures. Provider
history must never become the source of truth.

Model catalog, credentials, context windows, pricing, and availability must move
to a host-controlled model registry. The standalone kernel should consume a
validated model capability descriptor rather than import Muses administration
code.

## Sandbox boundary

Eve provides one sandbox per durable session. Locally, `defaultBackend()` selected
Docker in verification; `/workspace` persisted across turns of that session.
Different durable sessions do not intentionally share a workspace. Subagents use
independent sandboxes.

Local development may use Eve's availability-aware backend selection. Production
must set `AGENT_SANDBOX_BACKEND` to `docker`, `microsandbox`, or `vercel`; the
production doctor rejects implicit selection and requires
`AGENT_SANDBOX_IMAGE` pinned by OCI sha256 digest. The reviewed
`sandbox/Dockerfile` pins Eve's base image and adds Node/npm, Python, Git,
FFmpeg, ImageMagick, ripgrep, and Playwright/Chromium. The authored policy applies
2 vCPU/2048 MiB limits where supported, writes a session marker into the
session-owned `/workspace`, and applies `deny-all` egress at backend creation
and session start. Docker and microsandbox enforce the coarse policy; Vercel
Sandbox receives the live policy through Eve's network-policy API. Production
Docker deployments also require `EVE_SANDBOX_RETENTION_HOURS` and
`EVE_SANDBOX_REAPER_MAX_REMOVALS`. The operator reaper is dry-run by default,
owns only stopped containers carrying Eve's exact session labels and naming
convention, honors a protected-session list, revalidates a candidate before
deletion, and caps each invocation. A running container can be selected only by
an explicit exact session id plus `--include-running`. This makes cleanup
available without changing Eve's durable reattachment semantics.

Physical deletion is authorized by the Agent product database, not by a Docker
label or age alone. The authenticated Web session deletion route verifies the
immutable session owner, terminally retires Eve with its continuation token, and
then creates one idempotent `agent_sandbox_deletions` record. The reaper claims
that record with a short lease, revalidates the container, removes it, and marks
the record completed; failures return to a retryable state. Missing ownership,
missing continuation state, cross-tenant requests, or a failed Eve reset leave
the sandbox intact.

Production still requires evidence on the selected deployment backend. Remaining gates are:

- an explicitly selected backend and resource limits;
- deny-all or allow-listed egress by default;
- credential brokering instead of secrets inside the sandbox;
- deployed reaper scheduling, product-authorized deletion, timeout, and durable audit policies;
- adversarial isolation tests across users and sessions.
- website/Python/media task evals that build or process a real fixture and
  verify the returned preview or artifact URL, file bytes, and ownership;
- a dynamic Preview Gateway with bounded process/port lifecycle before
  promising long-running server previews.

Skills add instructions; they do not add authority. MCP connections and tools
must be scoped by the current principal, session, and approval policy.

Host-published Skill manifests and procedure markdown may be carried in the
credential-free `AgentRuntimeConfigSnapshot.extensions` field. The Agent pins
that snapshot at session start, validates that Profile grants have matching
manifests, and resolves the Skill dynamically for the session. MCP entries may
currently be declared as HTTPS endpoint metadata only; the runtime does not
turn that metadata into a live connection until a host-provided auth and tool
adapter is installed.

Eve compaction remains deployment-level configuration. The Runtime Config
contract exposes the selected threshold for UI and audit consistency, but it
does not claim that a tenant can change Eve's compaction algorithm or threshold
for an already compiled deployment.

The extension control plane separates four facts that must not be conflated:

1. the deployment catalog declares reviewed, immutable code and versions;
2. a Profile declares the maximum extensions one Run may request;
3. a tenant installation enables or revokes a catalog version and stores only
   an opaque credential reference where one is required;
4. the Run records the exact narrowed snapshot it requested.

The Agent API and Eve dynamic resolvers re-check tenant state before execution.
Only JWT principals with `agent.extensions.manage` may change installations.
Every enable/revoke mutation is appended to `agent_extension_audit_events`;
credential references and values are excluded from audit state. A revocation
takes effect on the next Run or continuation boundary, not retroactively on a
completed external side effect. The deployment currently publishes one Skill
and intentionally publishes no MCP connection until its endpoint, tool
allowlist, principal-scoped auth, approval policy, and real execution eval exist.

## Authentication and authorization

Local development uses Eve's local development auth. Vercel OIDC supports
trusted service calls. Production hosts can now sign short-lived HMAC JWTs;
the Eve channel verifies issuer, audience, signature, expiry and the required
`tenantId` before a run starts. The host JWT adapter is generic and does not
import Muses identity code.

Eve route auth does not natively enforce session ownership. The Agent service
therefore records the verified `tenantId + principalId` in its own PostgreSQL
table from the durable `session.started` hook. The Host JWT auth wrapper checks
that immutable owner on every session-specific continue, stream, cancel, file,
and callback path. The standard reset route carries its session identity in the
continuation token, so it is authenticated by Eve's token validation rather
than a path-based ownership lookup. Creation is allowed before a session id
exists; the first subscription waits briefly for the durable ownership claim to
remove the create/stream race, then fails closed. Model preference headers
remain untrusted until validated and projected by the authenticated channel.

## Web integration contract

### Integration status (2026-08)

The Muses Studio reference integration currently has two separate surfaces:

- The browser workspace is mounted through the optional `/embed` iframe. The
  `agent.embed.*` `postMessage` contract carries initialization, lifecycle, and
  host-capability events; it is a UI transport, not the Agent runtime or an
  SDK requirement.
- Server-side hosts and Workflow nodes use the framework-neutral AgentRun HTTP
  API (`/api/agent/runs`). The Agent-to-host canvas bridge uses the signed
  `host_capabilities`/`host_invoke` protocol.

The repository now builds `@oworker/open-agent-contracts@0.1.0-alpha.9`,
`@oworker/open-agent-client@0.1.0-alpha.9`, `@oworker/open-agent-host@0.1.0-alpha.9`, and
`@oworker/open-agent-ui@0.1.0-alpha.9` as real ESM/declaration packages with stable
subpath exports. A conformance command packs all four tarballs, installs them
in an empty consumer, and imports their public entrypoints, an individual AI
Element, and the stylesheet export. The compiled ESM, declarations, source
maps, and stylesheet are committed with each release so pnpm consumers can pin
an exact Git commit plus package subdirectory without running a build or
persisting an expiring release-asset URL. CI rejects any drift between those
committed artifacts and a clean SDK build. The packages remain private while
the open-source license decision and stable registry release pipeline are
pending. Versioned GitHub prerelease tarballs remain installable by npm and
pnpm consumers, but the packages remain npm-private. Therefore the current
state is **optional iframe +
native React UI + custom UI SDK paths backed by open HTTP/protocol contracts and
public alpha artifacts**. It is no longer iframe-only, but it is not yet a
public production-stable release.

On 2026-08-03 the Muses Host conformance slice also completed one real media
outcome through the public protocol: the standalone Web Agent discovered
`image.generate`, invoked it with a natural-language request, received a real
OpenAI image Asset, inspected the authoritative canvas, and projected token
usage. The Host-side acceptance additionally verified object bytes, Asset and
Workflow receipts, credit settlement, and a fresh canvas read. This proves the
first Muses outcome path; it does not close the remaining sandbox, OAuth, load,
SLO, billing reconciliation, licensing, or public-release gates.

The release boundary is intentionally split so the Agent remains host-neutral:

1. `@oworker/open-agent-contracts`: versioned AgentRun, event, Host Capability, and
   embed schemas.
2. `@oworker/open-agent-client`: headless HTTP AgentRun client for Workflow and other
   backends plus an optional `eve-session` adapter implementing the
   host-neutral interactive AgentSession surface. The root entrypoint imports
   neither React nor Eve.
3. `@oworker/open-agent-host`: server-side capability registration/signing and host
   adapter primitives; Muses provides the first implementation.
4. `@oworker/open-agent-ui`: host-neutral React workspace exports based on the
   shared AI Elements components. The iframe remains an adapter built on this
   package, not its dependency.

All four package boundaries and their artifact-installation check are now
implemented. `AgentWorkspace` receives its model catalog, defaults, storage,
transport, branding, locale behavior, and Host slots through public inputs; it
does not import the application model profile or Muses state. The standalone
page and `/embed` consume the same package. The precompiled CSS export follows
host theme variables with safe light fallbacks and does not require host
Tailwind processing. The Agent runtime consumes the Host client rather than
owning a duplicate signer.

The non-iframe `examples/custom-host-react` consumer imports no Agent UI. It
uses the Eve AgentSession adapter with a dynamic token provider and proves the
custom presentation path for streaming, continuation, approval, cancellation,
and persisted recovery. The packages become public only after semantic
versioning policy, self-hosted setup, license approval, and cross-host
capability conformance tests are shipped. Until then, external integrations
must treat these alpha packages and the documented HTTP/protocol contracts as
draft.

The current `AgentWorkspace` is the reference shell. The reusable package
surface now exposes:

- `AgentClient`: typed session creation, continuation, cancellation, and event
  persistence interfaces;
- `AgentWorkspace`: AI Elements UI with injectable storage, transport, locale,
  branding, and host slots;
- Host Capability signing, verification, client, and registry primitives;
- versioned headless events from which hosts can build their own presentation
  projection without importing React or the iframe.

The reference workspace now accepts Eve host, auth, rotating headers, redirect
policy, and `prepareSend` injection through `AgentWorkspaceClientConfig`. This is
the first Host SDK boundary: Muses can attach authenticated transport and
ephemeral canvas context while reusing the same session and AI Elements UI.

No package may import Muses canvas state directly. Muses integration should be a
separate adapter package and a set of permissioned canvas tools.

## Observability

Eve events already expose step usage, cache reads and writes, provider metadata,
tool results, failures, and turn boundaries. The Web client currently summarizes
input tokens, output tokens, cache reads, cost, steps, and duration.

The Agent Web API and Eve runtime now register the same standard OpenTelemetry
export path and propagate W3C trace context only to configured Runtime and Host
origins. Synchronous HTTP hops keep parent-child context. The Eve Workflow queue
is a durable asynchronous boundary, so `open_agent.turn.accepted` records a
Span Link to the originating Web request and stays in the Agent execution trace.
Eve spans carry AgentRun, correlation, session, Profile, Project and Canvas ids
while full prompts and outputs remain disabled. A local Postgres World
conformance run proved the link and proved a private prompt probe was not
exported, including the Provider-failure exception path: raw SDK error messages
and causes are discarded before the durable error reaches telemetry. Production
still needs a deployed collector conformance run, billing
reconciliation, latency and error dashboards, and retention controls. UI
projections are not an audit log.

## Release gates

The current implementation has passed type checking, deterministic browser
tests, Eve production build under Node 24, Next production build, HMAC Host
bridge tests, and a two-process local production smoke test. The Headless
AgentRun protocol has also passed a local Eve/PostgreSQL conformance run.
The Eve-native fixed suite additionally passes 58/58 gates against real Docker
sandboxes for file/Shell/checkpoint autonomy, tool failure recovery, durable
approval, cancellation, cross-turn continuity, static website preview delivery,
Python artifact delivery, and ImageMagick/FFmpeg media rendering. PostgreSQL extension
lifecycle conformance proves default enablement, tenant revocation, re-enable,
and credential-minimized append-only audit records.
Cancellation prefers Eve's cooperative boundary
and uses an exclusive-session reset when the installed preview runtime accepts
the signal without settling the provider turn.

The project must not be called production-complete until all of these are done:

- physical sandbox/network-isolation tests on the selected deployment backend;
- a real credentialed MCP connection with allowlist, approval, OAuth/revocation,
  and adversarial execution evidence (the shared lifecycle control plane exists);
- Host SDK and Muses adapter published with a versioned capability conformance suite;
- public Contracts/Client/Host/UI packages, license, registry release, and release provenance;
- provider registry, credential routing, quota, billing, and failover;
- deployed collector dashboards, trace retention, and cost reconciliation;
- protocol and UI conformance suites across supported hosts;
- production identity, authorization, abuse protection, retention, and deletion;
- deployment validation on the selected hosting topology.

The headless AgentRun API itself has passed deterministic unit tests and a local
production conformance run against Eve 0.27.8, PostgreSQL World, Host JWT
authentication, structured output, event cursors, idempotency, isolation, and
bounded cancellation reconciliation. That evidence does not waive the remaining
release gates above.
