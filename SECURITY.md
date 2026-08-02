# Security Policy

## Reporting

Do not open a public issue for a vulnerability that may expose credentials,
private prompts, customer data, host capabilities, sandboxes, or deployment
infrastructure. Use GitHub private vulnerability reporting when it is enabled.
If that channel is unavailable, contact the repository owner privately through
the contact published on the GitHub account.

Include the affected revision, impact, minimal reproduction, and any suggested
mitigation. Do not access data that is not yours, persist access, degrade a
service, or publish exploit details before a fix and disclosure plan exist.

## Supported State

`muses-agent` is an alpha integration preview. Security fixes target the current
`main` branch and the newest GitHub prerelease. Older alpha artifacts may be
replaced rather than patched. A stable support window will be published before
the first stable release.

## Secrets And Private Data

- Never commit provider keys, OAuth tokens, Host JWT or HMAC secrets, database
  URLs, production environment files, customer content, or private prompts.
- Keep credentials in a deployment secret manager and use opaque credential
  references for extensions.
- Do not put provider credentials inside Agent sandboxes or browser storage.
- Keep prompt and output recording disabled in telemetry. Treat exception
  messages from provider SDKs as potentially containing request bodies.
- Revoke and rotate any exposed credential immediately. Removing it from the
  latest Git revision is not sufficient.

## Deployment Responsibility

Eve is a preview dependency and can expose powerful tools. Deployers must review
tool approvals, route authorization, extension scopes, sandbox isolation,
network egress, retention, telemetry, and abuse controls for their environment.
The repository production doctor is a preflight check, not a security boundary.

