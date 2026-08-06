import { AgentPage } from "../../../../agent-page";

export default async function SubagentSessionPage({
  params,
}: {
  readonly params: Promise<{
    readonly sessionId: string;
    readonly threadId: string;
  }>;
}) {
  const { sessionId, threadId } = await params;
  return <AgentPage initialSubagentSessionId={sessionId} initialThreadId={threadId} />;
}
