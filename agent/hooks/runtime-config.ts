import { defineHook } from "eve/hooks";
import { initializeAgentRuntimeConfig } from "../lib/runtime-config.ts";

export default defineHook({
  events: {
    "session.started"(_event, ctx) {
      initializeAgentRuntimeConfig(ctx);
    },
  },
});
