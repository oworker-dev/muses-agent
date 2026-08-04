# @oworker/open-agent-client

Framework-neutral TypeScript client for the Headless AgentRun HTTP contract.

The package supports dynamic short-lived bearer tokens, idempotent run starts,
incremental event cursors, inspection, cancellation, structured HTTP errors,
and response contract validation. It has no React or Muses product dependency.

`@oworker/open-agent-client/eve-session` is the default Eve 0.27.x adapter for the
host-neutral AgentSession cursor, streaming, continuation, cancellation, and
reset interfaces. Eve is an optional peer dependency so Headless AgentRun hosts
do not install a Harness client they do not use.
