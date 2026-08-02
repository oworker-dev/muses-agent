import { defineDynamic, defineSkill, type DynamicResolveContext } from "eve/skills";
import { resolveAgentRunPolicy } from "../../lib/agent-extension-catalog.ts";
import { readAgentRunPolicy } from "../lib/run-policy.ts";
import { createPostgresAgentExtensionStoreFromEnvironment } from "../../server/data/agent-extension-store.ts";

const SOFTWARE_TASK = {
  id: "software-task",
  version: "1.0.0",
} as const;
const extensionStore = createPostgresAgentExtensionStoreFromEnvironment();

async function resolvePublishedSkills(ctx: DynamicResolveContext) {
  const attributes = ctx.session.auth.current?.attributes;
  const policy = resolveAgentRunPolicy(
    {
      profileId:
        typeof attributes?.agentProfileId === "string"
          ? attributes.agentProfileId
          : "general-purpose",
      version:
        typeof attributes?.agentProfileVersion === "string"
          ? attributes.agentProfileVersion
          : "0.1.0",
    },
    readAgentRunPolicy(ctx),
  );
  const tenantId = attributes?.tenantId;
  if (extensionStore && typeof tenantId === "string" && tenantId.trim()) {
    await extensionStore.assertPolicyAllowed(tenantId, policy);
  }
  if (!policy.skills?.some(
    (skill) => skill.id === SOFTWARE_TASK.id && skill.version === SOFTWARE_TASK.version,
  )) return null;

  return {
    "software-task": defineSkill({
      description:
        "Use when implementing, debugging, reviewing, or validating a software change in the workspace.",
      markdown:
        "Inspect the repository instructions and current state before editing. Preserve unrelated changes. Prefer existing project patterns and small, coherent edits. For a behavior change, add or update focused tests and run the narrowest useful validation first, then the broader project checks required by the risk. Report what changed, what was verified, and any remaining uncertainty.",
    }),
  };
}

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => resolvePublishedSkills(ctx),
    "turn.started": (_event, ctx) => resolvePublishedSkills(ctx),
  },
});
