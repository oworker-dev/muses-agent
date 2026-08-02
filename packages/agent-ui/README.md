# @muses/agent-ui

Reusable React workspace and AI Elements for the independent Muses Agent
service. The package owns presentation and durable Eve session projection, but
does not own host identity, model entitlement, billing, or Muses canvas state.

Import the precompiled stylesheet once in the host application:

```css
@import "@muses/agent-ui/styles.css";
```

Then inject the host-reviewed model catalog and defaults:

```tsx
import { AgentWorkspace } from "@muses/agent-ui";

export function AgentPage() {
  return (
    <AgentWorkspace
      agentName="general-agent"
      defaultPreferences={{ modelId: "provider/model", reasoning: "high" }}
      models={[{ id: "provider/model", label: "Model", contextWindowTokens: 128000 }]}
      productName="Agent"
      reasoningLevels={["low", "medium", "high"]}
    />
  );
}
```

Individual AI Elements are available from subpaths such as
`@muses/agent-ui/ai-elements/message`. The package has explicit React, AI SDK,
and Eve peer dependencies. Hosts that own their UI can omit this package and
use `@muses/agent-client/eve-session` directly.
