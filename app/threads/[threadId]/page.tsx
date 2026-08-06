import { AgentPage } from "../../agent-page";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  readonly params: Promise<{ readonly threadId: string }>;
}) {
  const { threadId } = await params;
  return <AgentPage initialThreadId={threadId} />;
}
