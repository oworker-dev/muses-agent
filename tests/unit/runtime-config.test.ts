import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_RUNTIME_CONFIG_CONTRACT_VERSION,
  parseAgentRuntimeConfigSnapshot,
} from "@oworker/open-agent-contracts/runtime-config";
import {
  DEFAULT_AGENT_RUNTIME_CONFIG,
  readDeploymentAgentRuntimeConfig,
} from "../../lib/agent-runtime-config.ts";
import { createAgentUiConfig } from "../../lib/agent-ui-config.ts";

test("accepts a credential-free host runtime snapshot and projects its UI catalog", () => {
  const config = parseAgentRuntimeConfigSnapshot({
    ...DEFAULT_AGENT_RUNTIME_CONFIG,
    contractVersion: AGENT_RUNTIME_CONFIG_CONTRACT_VERSION,
    id: "third-party-host",
    version: "2.1.0",
    defaultModelId: "fast",
    models: [{
      id: "fast",
      providerModelId: "provider/private-model",
      label: "Fast",
      contextWindowTokens: 64_000,
      maxOutputTokens: 8_192,
      reasoningLevels: ["low", "medium"],
      defaultReasoning: "medium",
    }],
  });
  const ui = createAgentUiConfig(config);
  assert.deepEqual(ui.models, [{ id: "fast", label: "Fast", contextWindowTokens: 64_000 }]);
  assert.deepEqual(ui.defaultPreferences, { modelId: "fast", reasoning: "medium" });
  assert.deepEqual(ui.reasoningLevels, ["low", "medium"]);
});

test("rejects credentials, duplicate models, and unsupported defaults", () => {
  assert.throws(
    () => parseAgentRuntimeConfigSnapshot({
      ...DEFAULT_AGENT_RUNTIME_CONFIG,
      apiKey: "secret",
    }),
    /unknown field apiKey/,
  );
  assert.throws(
    () => parseAgentRuntimeConfigSnapshot({
      ...DEFAULT_AGENT_RUNTIME_CONFIG,
      models: [DEFAULT_AGENT_RUNTIME_CONFIG.models[0], DEFAULT_AGENT_RUNTIME_CONFIG.models[0]],
    }),
    /duplicated/,
  );
  assert.throws(
    () => parseAgentRuntimeConfigSnapshot({
      ...DEFAULT_AGENT_RUNTIME_CONFIG,
      defaultModelId: "missing",
    }),
    /defaultModelId/,
  );
});

test("loads a deployment snapshot without exposing provider credentials", () => {
  const config = readDeploymentAgentRuntimeConfig({
    AGENT_RUNTIME_CONFIG_JSON: JSON.stringify(DEFAULT_AGENT_RUNTIME_CONFIG),
    OPENAI_API_KEY: "must-not-appear",
  });
  assert.equal(JSON.stringify(config).includes("must-not-appear"), false);
});
