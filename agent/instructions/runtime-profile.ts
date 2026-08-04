import { defineDynamic, defineInstructions } from "eve/instructions";
import { readAgentRuntimeConfig } from "../lib/runtime-config.ts";

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => {
      const instructions = readAgentRuntimeConfig(ctx).profile.instructions;
      return instructions ? defineInstructions({ markdown: instructions }) : null;
    },
  },
});
