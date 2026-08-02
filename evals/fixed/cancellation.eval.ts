import { defineEval } from "eve/evals";

export default defineEval({
  description: "Cancels an in-flight sandbox command and reaches the durable cancellation boundary.",
  tags: ["fixed", "cancellation", "sandbox"],
  timeoutMs: 45_000,
  async test(t) {
    const live = await t.start("EVAL_CANCEL keep the sandbox command active.");
    await live.waitForEvent("actions.requested");
    await live.cancel();
    const turn = await live.result();
    turn.eventOrder([
      { type: "turn.cancelled" },
      { type: "session.waiting" },
    ]);
  },
});
