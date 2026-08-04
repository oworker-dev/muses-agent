import assert from "node:assert/strict";
import test from "node:test";

import {
  AgentThreadStorageConflictError,
  createHttpAgentThreadStorage,
} from "@oworker/open-agent-ui/agent-workspace";
import {
  AGENT_THREAD_STORAGE_VERSION,
  createAgentThread,
} from "@oworker/open-agent-ui/agent-workspace";

test("persists a loaded collection and advances its optimistic revision", async () => {
  const server = fakeThreadServer();
  const storage = createHttpAgentThreadStorage({
    fetch: server.fetch,
    getAccessToken: () => "test-token",
  });

  const initial = await storage.load("workspace-1");
  assert.equal(initial.threads.length, 0);

  const thread = createAgentThread(100, "Persist me");
  await storage.save("workspace-1", {
    activeThreadId: thread.id,
    threads: [thread],
    version: AGENT_THREAD_STORAGE_VERSION,
  });

  assert.equal(server.revision(), 1);
  assert.equal(server.collection().threads[0]?.title, "Persist me");
});

test("surfaces a conflict instead of overwriting another client", async () => {
  const server = fakeThreadServer();
  const first = createHttpAgentThreadStorage({ fetch: server.fetch, getAccessToken: () => "one" });
  const second = createHttpAgentThreadStorage({ fetch: server.fetch, getAccessToken: () => "two" });
  const firstCollection = await first.load("workspace-1");
  const secondCollection = await second.load("workspace-1");

  await first.save("workspace-1", firstCollection);
  await assert.rejects(
    async () => await second.save("workspace-1", secondCollection),
    (error: unknown) =>
      error instanceof AgentThreadStorageConflictError &&
      error.expectedRevision === 0 &&
      error.currentRevision === 1,
  );
});

function fakeThreadServer() {
  let revision = 0;
  let collection = { threads: [], version: AGENT_THREAD_STORAGE_VERSION } as const;

  return {
    collection: () => collection as { readonly threads: readonly ReturnType<typeof createAgentThread>[] },
    fetch: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      assert.match(new Headers(init?.headers).get("authorization") ?? "", /^Bearer /);
      if (init?.method !== "PUT") {
        return Response.json({ collection, revision }, { headers: { etag: `"${revision}"` } });
      }
      const expected = Number((new Headers(init.headers).get("if-match") ?? "").replaceAll('"', ""));
      if (expected !== revision) {
        return Response.json(
          { code: "thread_collection_conflict", ok: false },
          { status: 409, headers: { etag: `"${revision}"` } },
        );
      }
      const body = JSON.parse(String(init.body)) as { collection: typeof collection };
      collection = body.collection;
      revision += 1;
      return Response.json({ collection, revision }, { headers: { etag: `"${revision}"` } });
    }) as typeof fetch,
    revision: () => revision,
  };
}
