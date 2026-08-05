import { defineTool } from "eve/tools";
import { bash } from "eve/tools/defaults";

import {
  bashApprovalDecision,
  readBashApprovalMode,
} from "../../lib/bash-approval-policy.ts";
import { readAgentExecutionMode } from "../lib/run-policy.ts";

export default defineTool({
  ...bash,
  approval: ({ session, toolInput }) =>
    bashApprovalDecision({
      actorType: session.auth.current?.attributes.actorType,
      command:
        toolInput && typeof toolInput === "object" && "command" in toolInput
          ? toolInput.command
          : undefined,
      executionMode: readAgentExecutionMode({ session }),
      mode: readBashApprovalMode(),
      principalType: session.auth.current?.principalType,
    }),
});
