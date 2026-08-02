import { defineEval } from "eve/evals";

export default defineEval({
  description: "Recovers from a failed Shell action without poisoning the durable session.",
  tags: ["fixed", "recovery", "sandbox"],
  async test(t) {
    await t.send("EVAL_FAILURE_RECOVERY recover after the expected missing-file check.");
    t.succeeded();
    t.calledTool("read_file", {
      input: { filePath: "/workspace/expected-missing.txt" },
      status: "failed",
      count: 1,
    });
    t.calledTool("write_file", { status: "completed", count: 1 });
    t.calledTool("read_file", {
      input: { filePath: "/workspace/recovered.txt" },
      status: "completed",
      count: 1,
    });
    t.toolOrder(["read_file", "write_file", "read_file"]);
    t.messageIncludes("FAILURE_RECOVERY_COMPLETED");
  },
});
