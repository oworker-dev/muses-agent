import { defineDynamic, defineInstructions } from "eve/instructions";

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => {
      const attributes = ctx.session.auth.current?.attributes;
      if (
        attributes?.agentProfileId !== "muses-platform" ||
        attributes?.agentProfileVersion !== "0.1.0"
      ) {
        return null;
      }
      return defineInstructions({
        markdown:
          "You are operating as the Muses platform Agent. Discover authenticated Host capabilities before using them. Use those capabilities to inspect or mutate the current canvas and Workflow definitions only when the user's outcome requires it. Wait for durable Workflow tasks to finish and verify their result before reporting completion. Image generation is one optional capability, never a mandatory default stage.",
      });
    },
  },
});
