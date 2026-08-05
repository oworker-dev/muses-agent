# Eve MCP Adapter Package

This package creates compiled Eve MCP connections. Before changing its capabilities,
read `node_modules/eve/docs/extensions.md`, `connections/overview.mdx`,
`connections/mcp.mdx`, and `tools/human-in-the-loop.md` from the repository
root.

Keep the adapter host-neutral. It may enforce generic tenant, Run-policy,
credential-broker, allowlist, and approval contracts, but must not import or
name a Host product.

The connection URL and tool allowlist are explicit deployment source inputs.
Never accept raw third-party credentials in extension config, model context,
session attributes, tool inputs, or emitted events.
