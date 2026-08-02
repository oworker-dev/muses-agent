# Custom React host (no iframe)

This example owns every DOM element and imports no `@muses/agent-ui` code. It
uses `@muses/agent-client/eve-session` to prove that the Agent service is usable
without the reference workspace or iframe adapter.

The host supplies `getAccessToken`; the Eve adapter calls it again for every
request and stream reconnect, so the function should return a current
short-lived Host JWT. The example persists the framework-neutral session cursor
and event log, reconnects an interrupted turn, streams events, replies to HITL
options, and requests cooperative turn cancellation.

```tsx
import { CustomAgentPanel } from "@muses/example-custom-host-react";
import "@muses/example-custom-host-react/styles.css";

<CustomAgentPanel
  baseUrl="https://agent.example.com"
  getAccessToken={() => hostAuth.getAgentToken()}
/>
```
