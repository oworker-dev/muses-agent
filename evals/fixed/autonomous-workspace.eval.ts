import { defineEval } from "eve/evals";

export default defineEval({
  description: "Loads a Skill and completes a file, Shell, read, and checkpoint loop.",
  tags: ["fixed", "sandbox"],
  async test(t) {
    await t.send("EVAL_AUTONOMY_FILE complete the autonomous workspace task.");
    t.succeeded();
    t.loadedSkill("software-task", { count: 1 });
    t.toolOrder(["load_skill", "write_file", "bash", "read_file", "record_checkpoint"]);
    t.calledTool("write_file", {
      input: { filePath: "/workspace/autonomy.txt" },
      count: 1,
    });
    t.calledTool("bash", { input: { command: /^sha256sum /u }, count: 1 });
    t.calledTool("read_file", {
      input: { filePath: "/workspace/autonomy.txt" },
      count: 1,
    });
    t.noFailedActions();
    t.messageIncludes("AUTONOMY_FILE_COMPLETED");
  },
});
