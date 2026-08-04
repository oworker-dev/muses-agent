import assert from "node:assert/strict";
import test from "node:test";

import {
  boundedProviderMaxOutputTokens,
  providerOutputBudgetMiddleware,
} from "../../lib/provider-output-budget.ts";

test("sets a per-request Provider output budget when the caller omits one", () => {
  assert.equal(boundedProviderMaxOutputTokens(undefined, 4_096), 4_096);
});

test("preserves a tighter caller budget and caps a larger task budget", () => {
  assert.equal(boundedProviderMaxOutputTokens(512, 4_096), 512);
  assert.equal(boundedProviderMaxOutputTokens(20_000, 4_096), 4_096);
});

test("transforms explicit Eve task-mode budgets before the Provider call", async () => {
  const middleware = providerOutputBudgetMiddleware(4_096);
  const transformed = await middleware.transformParams!({
    model: {} as never,
    params: { maxOutputTokens: 20_000 } as never,
    type: "stream",
  });
  assert.equal(transformed.maxOutputTokens, 4_096);
});
