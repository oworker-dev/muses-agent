import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Record a concise task checkpoint when substantial work must continue across several steps.",
  inputSchema: z.object({
    completed: z.array(z.string()).default([]),
    next: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    summary: z.string().min(1),
  }),
  execute(input) {
    return input;
  },
});
