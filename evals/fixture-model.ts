import { mockModel, type MockModelRequest } from "eve/evals";

export const AUTONOMY_EVAL_FIXTURE = "autonomy-v1";

export function createAutonomyEvalModel() {
  return mockModel({
    modelId: AUTONOMY_EVAL_FIXTURE,
    provider: "open-agent-eval",
    respond: respond,
  });
}

function respond(request: MockModelRequest) {
  if (isCompactionRequest(request)) return compactionCheckpoint(request);
  const task = request.lastUserMessage ?? "";
  if (task.includes("EVAL_AUTONOMY_FILE")) return autonomyFile(request);
  if (task.includes("EVAL_FAILURE_RECOVERY")) return failureRecovery(request);
  if (task.includes("EVAL_APPROVAL")) return approval(request);
  if (task.includes("EVAL_CANCEL")) {
    return tool("bash", { command: "sleep 30" }, "eval-cancel-bash");
  }
  if (task.includes("EVAL_CONTEXT_STORE")) return contextStore(request);
  if (task.includes("EVAL_CONTEXT_RECALL")) return contextRecall(request);
  if (task.includes("EVAL_COMPACTION_SETUP")) return compactionSetup(request);
  if (task.includes("EVAL_COMPACTION_FILL")) return "COMPACTION_FILL_ACK";
  if (task.includes("EVAL_COMPACTION_MUTATE")) return compactionMutate(request);
  if (task.includes("EVAL_COMPACTION_VERIFY")) return compactionVerify(request);
  return "EVAL_FIXTURE_UNKNOWN_TASK";
}

function isCompactionRequest(request: MockModelRequest): boolean {
  return request.messages.some(
    (message) =>
      message.role === "system" &&
      message.text.includes("CONTEXT CHECKPOINT COMPACTION"),
  );
}

function compactionCheckpoint(request: MockModelRequest) {
  const prompt = request.lastUserMessage ?? "";
  const hasPreviousCheckpoint = !prompt.includes("<previous-checkpoint>\n(none)");
  const facts = [
    prompt.includes("CERULEAN-47") ? "fact=CERULEAN-47" : "fact=missing",
    prompt.includes("ORBIT-73") ? "tool=ORBIT-73" : "tool=missing",
    prompt.includes("BETA-91") ? "mutation=BETA-91" : "mutation=pending",
  ];
  return [
    hasPreviousCheckpoint ? "COMPACTION_CHECKPOINT_INCREMENTAL" : "COMPACTION_CHECKPOINT_INITIAL",
    ...facts,
    "constraint=preserve exact facts, active todo, and read-before-write safety",
  ].join("; ");
}

function compactionSetup(request: MockModelRequest) {
  if (!resultById(request, "eval-compaction-todo-set")) {
    return tool("todo", {
      todos: [
        {
          content: "Preserve CERULEAN-47 and ORBIT-73 across compaction",
          priority: "high",
          status: "completed",
        },
        {
          content: "Verify compaction invariants",
          priority: "high",
          status: "in_progress",
        },
      ],
    }, "eval-compaction-todo-set");
  }
  if (!resultById(request, "eval-compaction-write-initial")) {
    return tool("write_file", {
      content: "CERULEAN-47 ORBIT-73\n",
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-write-initial");
  }
  if (!resultById(request, "eval-compaction-read-initial")) {
    return tool("read_file", {
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-read-initial");
  }
  return "COMPACTION_SETUP_COMPLETED CERULEAN-47 ORBIT-73";
}

function compactionMutate(request: MockModelRequest) {
  const unsafeWrite = resultById(request, "eval-compaction-write-without-reread");
  if (!unsafeWrite) {
    return tool("write_file", {
      content: "CERULEAN-47 ORBIT-73 BETA-91\n",
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-write-without-reread");
  }
  if (!unsafeWrite.isError) return "COMPACTION_SAFETY_INVALID";
  if (!resultById(request, "eval-compaction-reread")) {
    return tool("read_file", {
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-reread");
  }
  if (!resultById(request, "eval-compaction-write-after-reread")) {
    return tool("write_file", {
      content: "CERULEAN-47 ORBIT-73 BETA-91\n",
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-write-after-reread");
  }
  if (!resultById(request, "eval-compaction-todo-read")) {
    return tool("todo", {}, "eval-compaction-todo-read");
  }
  return "COMPACTION_MUTATION_COMPLETED BETA-91";
}

function compactionVerify(request: MockModelRequest) {
  if (!resultById(request, "eval-compaction-read-final")) {
    return tool("read_file", {
      filePath: "/workspace/compaction.txt",
    }, "eval-compaction-read-final");
  }
  if (!resultById(request, "eval-compaction-todo-final")) {
    return tool("todo", {}, "eval-compaction-todo-final");
  }
  const prompt = request.messages.map((message) => message.text).join("\n");
  const file = JSON.stringify(resultById(request, "eval-compaction-read-final")?.output);
  const todos = JSON.stringify(resultById(request, "eval-compaction-todo-final")?.output);
  const verified =
    prompt.includes("COMPACTION_CHECKPOINT_INCREMENTAL") &&
    prompt.includes("[Your task list was preserved across context compaction]") &&
    prompt.includes("Verify compaction invariants") &&
    file.includes("CERULEAN-47") &&
    file.includes("ORBIT-73") &&
    file.includes("BETA-91") &&
    todos.includes("Verify compaction invariants");
  return verified
    ? "COMPACTION_VERIFIED CERULEAN-47 ORBIT-73 BETA-91 TODO_PRESERVED"
    : "COMPACTION_VERIFICATION_FAILED";
}

function autonomyFile(request: MockModelRequest) {
  if (!hasResult(request, "load_skill")) {
    return tool("load_skill", { skill: "software-task" }, "eval-load-skill");
  }
  if (!hasResult(request, "write_file")) {
    return tool("write_file", {
      content: "open-agent autonomy fixture\n",
      filePath: "/workspace/autonomy.txt",
    }, "eval-write-file");
  }
  if (!hasResult(request, "bash")) {
    return tool("bash", {
      command: "sha256sum /workspace/autonomy.txt",
    }, "eval-hash-file");
  }
  if (!hasResult(request, "read_file")) {
    return tool("read_file", {
      filePath: "/workspace/autonomy.txt",
    }, "eval-read-file");
  }
  if (!hasResult(request, "record_checkpoint")) {
    return tool("record_checkpoint", {
      completed: ["loaded procedure", "wrote file", "verified hash", "read result"],
      next: [],
      risks: [],
      summary: "The standalone Agent completed the autonomous workspace task.",
    }, "eval-checkpoint");
  }
  return "AUTONOMY_FILE_COMPLETED";
}

function failureRecovery(request: MockModelRequest) {
  const failedRead = resultById(request, "eval-expected-failure");
  if (!failedRead) {
    return tool("read_file", {
      filePath: "/workspace/expected-missing.txt",
    }, "eval-expected-failure");
  }
  if (!resultById(request, "eval-recovery-write")) {
    return tool("write_file", {
      content: "recovered after expected failure\n",
      filePath: "/workspace/recovered.txt",
    }, "eval-recovery-write");
  }
  if (!resultById(request, "eval-recovery-read")) {
    return tool("read_file", {
      filePath: "/workspace/recovered.txt",
    }, "eval-recovery-read");
  }
  return failedRead.isError ? "FAILURE_RECOVERY_COMPLETED" : "FAILURE_RECOVERY_INVALID";
}

function approval(request: MockModelRequest) {
  if (!hasResult(request, "bash")) {
    return tool("bash", {
      command: "rm -f /workspace/approval-target.txt && printf APPROVED",
    }, "eval-risky-bash");
  }
  return "APPROVAL_COMPLETED";
}

function contextStore(request: MockModelRequest) {
  const writesThisTurn = request.toolResults.filter(
    (item) => item.name === "write_file" && item.id === "eval-context-write",
  );
  if (writesThisTurn.length === 0) {
    return tool("write_file", {
      content: "marigold\n",
      filePath: "/workspace/context.txt",
    }, "eval-context-write");
  }
  return "CONTEXT_STORED";
}

function contextRecall(request: MockModelRequest) {
  if (!hasResult(request, "read_file")) {
    return tool("read_file", {
      filePath: "/workspace/context.txt",
    }, "eval-context-read");
  }
  return "CONTEXT_RECALLED marigold";
}

function hasResult(request: MockModelRequest, name: string): boolean {
  return Boolean(result(request, name));
}

function result(request: MockModelRequest, name: string) {
  return request.toolResults.find((item) => item.name === name);
}

function resultById(request: MockModelRequest, id: string) {
  return request.toolResults.find((item) => item.id === id);
}

function tool(name: string, input: unknown, id: string) {
  return {
    toolCalls: [{ id, input, name }],
    usage: { inputTokens: 100, outputTokens: 10 },
  };
}
