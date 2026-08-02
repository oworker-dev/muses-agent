# @muses/agent-host

Server-side primitives for exposing capabilities to a standalone Agent.

The package signs and verifies scoped Host Capability requests, provides a
typed capability client, and supplies a host-neutral registry. It intentionally
does not authenticate application users, query a host database, decide tenant
membership, or import Muses canvas code. Those remain host adapter concerns.
