import { defineHook } from "eve/hooks";
import { sessionOwnerFromAuth } from "../lib/session-ownership-auth";
import { createPostgresSessionOwnershipStoreFromEnvironment } from "../../server/data/session-ownership-store";

const ownershipStore = createPostgresSessionOwnershipStoreFromEnvironment();

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const auth = ctx.session.auth.initiator ?? ctx.session.auth.current;
      const tenantId = auth?.attributes.tenantId;
      if (!auth || typeof tenantId !== "string" || tenantId.trim().length === 0) return;
      if (!ownershipStore) {
        throw new Error("AGENT_DATABASE_URL is required for tenant-scoped Agent sessions.");
      }
      await ownershipStore.claim(ctx.session.id, sessionOwnerFromAuth(auth));
    },
  },
});
