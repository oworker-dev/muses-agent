import { mockModel, type MockModelRequest } from "eve/evals";

export const MCP_EVAL_FIXTURE = "mcp-conformance-v1";

export function createMcpEvalModel() {
  return mockModel({
    modelId: MCP_EVAL_FIXTURE,
    provider: "open-agent-eval",
    respond(request) {
      const forbiddenCredentialMarkers = [
        process.env.MCP_FIXTURE_BROKER_TOKEN,
        process.env.MCP_FIXTURE_CREDENTIAL,
      ].filter((marker): marker is string => Boolean(marker));
      const visibleModelInput = JSON.stringify({
        messages: request.messages,
        toolResults: request.toolResults,
        tools: request.tools,
      });
      if (forbiddenCredentialMarkers.some((marker) => visibleModelInput.includes(marker))) {
        return "MCP_CREDENTIAL_LEAK_DETECTED";
      }
      const task = request.lastUserMessage ?? "";
      if (task.includes("EVAL_MCP_READ")) return runMcpRead(request);
      if (task.includes("EVAL_MCP_WRITE")) return runMcpWrite(request);
      return "MCP_FIXTURE_UNKNOWN_TASK";
    },
  });
}

function runMcpRead(request: MockModelRequest) {
  const searchId = turnCallId(request, "mcp-read-search");
  const callId = turnCallId(request, "mcp-read-call");
  if (!resultById(request, searchId)) {
    return tool("connection_search", {
      connection: "gateway",
      keywords: "read secret records delete",
      limit: 10,
    }, searchId);
  }
  const search = resultById(request, searchId);
  if (search?.isError) return "MCP_READ_SEARCH_FAILED";
  const readTool = request.tools.find((candidate) => candidate.name.endsWith("__read_record"));
  if (!readTool) return "MCP_READ_TOOL_NOT_DISCOVERED";
  if (request.tools.some((candidate) => candidate.name.endsWith("__hidden_delete"))) {
    return "MCP_HIDDEN_TOOL_DISCOVERED";
  }
  if (!resultById(request, callId)) {
    return tool(readTool.name, { key: "alpha" }, callId);
  }
  return resultById(request, callId)?.isError
    ? "MCP_READ_FAILED"
    : "MCP_READ_COMPLETED";
}

function runMcpWrite(request: MockModelRequest) {
  const searchId = turnCallId(request, "mcp-write-search");
  const callId = turnCallId(request, "mcp-write-call");
  if (!resultById(request, searchId)) {
    return tool("connection_search", {
      connection: "gateway",
      keywords: "write update record",
      limit: 10,
    }, searchId);
  }
  const writeTool = request.tools.find((candidate) => candidate.name.endsWith("__write_record"));
  if (!writeTool) return "MCP_WRITE_TOOL_NOT_DISCOVERED";
  if (!resultById(request, callId)) {
    return tool(writeTool.name, { key: "alpha", value: "updated" }, callId);
  }
  return resultById(request, callId)?.isError
    ? "MCP_WRITE_BLOCKED"
    : "MCP_WRITE_COMPLETED";
}

function resultById(request: MockModelRequest, id: string) {
  return request.toolResults.find((item) => item.id === id);
}

function turnCallId(request: MockModelRequest, base: string) {
  return `${base}-${request.userMessageCount}`;
}

function tool(name: string, input: unknown, id: string) {
  return {
    toolCalls: [{ id, input, name }],
    usage: { inputTokens: 100, outputTokens: 10 },
  };
}
