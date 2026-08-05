# Release Runbook

The repository publishes immutable GitHub prerelease artifacts while the npm
packages remain private. A license and stable public package policy are separate
product-owner decisions; do not infer them from this automation.

## Version Policy

- Use SemVer prerelease versions such as `0.1.0-alpha.5`.
- Keep the root, all SDK workspaces, public version constants, examples, tests,
  and host dependency URLs on the same alpha version.
- Never move or reuse a published tag. A correction receives a new version.
- Protocol compatibility is explicit in contracts; matching package versions
  do not authorize an incompatible protocol change.

## Release Procedure

1. Run `npm run verify:ci` under Node.js 24.
2. Review dependency changes, generated declarations, package contents, and the
   secret scan. Confirm no `.env`, credentials, test databases, traces, or user
   artifacts are tracked.
3. Commit and push `main`; require the CI workflow to pass.
4. Create and push an annotated tag matching `v<package.json version>`.
5. The prerelease workflow rebuilds from the tag, verifies the version, packs
   all four SDKs, emits `SHA256SUMS`, uploads artifacts, and requests GitHub
   build-provenance attestations.
6. A separate release job builds `sandbox/Dockerfile`, publishes version and
   `v`-prefixed tags to `ghcr.io/<owner>/open-agent-sandbox`, runs the runtime
   probe against the returned immutable digest, emits an SBOM, and requests a
   registry provenance attestation.
7. Verify the release assets, image digest, SBOM, and attestations, then update
   deployment and host references in a separate reviewed commit. Do not point a
   host at an artifact or mutable image tag before the release exists.

The workflow does not publish to npm. Removing `private: true`, selecting a
license, setting npm provenance, and defining stable support/migration policy
require an explicit release decision.
