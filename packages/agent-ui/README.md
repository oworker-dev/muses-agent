# @oworker/open-agent-ui

Reusable React workspace and AI Elements for the independent Open Agent
service. The package owns presentation and durable Eve session projection, but
does not own host identity, model entitlement, billing, or host business state.

Import the precompiled stylesheet once in the host application:

```css
@import "@oworker/open-agent-ui/styles.css";
```

Then inject the host-reviewed model catalog and defaults:

```tsx
import { AgentWorkspace } from "@oworker/open-agent-ui";

export function AgentPage() {
  return (
    <AgentWorkspace
      agentName="general-agent"
      commands={[{ id: "software-task", label: "Software task", value: "/software-task" }]}
      defaultPreferences={{ modelId: "provider/model", reasoning: "high" }}
      extensions={[{ id: "software-task", kind: "skill", label: "Software task", status: "available" }]}
      mentions={[{ id: "workspace", label: "Workspace", value: "@workspace" }]}
      models={[{ id: "provider/model", label: "Model", contextWindowTokens: 128000 }]}
      productName="Agent"
      reasoningLevels={["low", "medium", "high"]}
    />
  );
}
```

The package carries the complete AI Elements and shadcn/ui registries used by
the product. Import their barrels or stable subpaths such as
`@oworker/open-agent-ui/ai-elements/context` and `@oworker/open-agent-ui/ui/button`.
`commands`, `mentions`, and `extensions` are host-injected catalogs; Muses
canvas concepts never become a dependency of this package. Hosts that own their
UI can omit this package and use `@oworker/open-agent-client/eve-session` directly.
