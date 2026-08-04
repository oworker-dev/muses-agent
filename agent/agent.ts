import { createOpenAI } from "@ai-sdk/openai";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { defineAgent, defineDynamic } from "eve";
import {
  AUTONOMY_EVAL_FIXTURE,
  createAutonomyEvalModel,
} from "../evals/fixture-model";
import {
  AGENT_MODEL_OPTIONS,
  DEFAULT_AGENT_MODEL_ID,
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  isAgentModelId,
  isAgentReasoningLevel,
  readAgentEvalContextWindowTokens,
  readAgentModelMaxOutputTokens,
  type AgentModelId,
  type AgentReasoningLevel,
} from "../lib/agent-profile";
import { createProviderFetch } from "../lib/provider-http";
import { providerOutputBudgetMiddleware } from "../lib/provider-output-budget";
import { eveOwnedProviderRetryMiddleware } from "../lib/provider-retry-boundary";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  fetch: createProviderFetch(),
});

const configuredDefaultModel = process.env.AGENT_MODEL_ID;
const defaultModelId = isAgentModelId(configuredDefaultModel)
  ? configuredDefaultModel
  : DEFAULT_AGENT_MODEL_ID;
const workflowWorld = process.env.WORKFLOW_TARGET_WORLD?.trim();
const evalFixtureModel = process.env.AGENT_EVAL_FIXTURE_MODEL === AUTONOMY_EVAL_FIXTURE
  ? createAutonomyEvalModel()
  : undefined;
const evalContextWindowTokens = evalFixtureModel
  ? readAgentEvalContextWindowTokens()
  : DEFAULT_CONTEXT_WINDOW_TOKENS;
const modelMaxOutputTokens = readAgentModelMaxOutputTokens();

function createAgentModel(modelId: AgentModelId, reasoning?: AgentReasoningLevel) {
  return wrapLanguageModel({
    middleware: [
      defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: {
              ...(reasoning ? { reasoningEffort: reasoning } : {}),
              store: false,
            },
          },
        },
      }),
      providerOutputBudgetMiddleware(modelMaxOutputTokens),
      eveOwnedProviderRetryMiddleware,
    ],
    model: openai(modelId),
  });
}

export default defineAgent({
  description: "A general-purpose autonomous agent for research, software, and knowledge work.",
  model: defineDynamic({
    fallback: evalFixtureModel ?? createAgentModel(defaultModelId),
    events: {
      "step.started": (_event, ctx) => {
        if (evalFixtureModel) {
          return {
            model: evalFixtureModel,
            modelContextWindowTokens: evalContextWindowTokens,
          };
        }
        const attributes = ctx.session.auth.current?.attributes;
        const requestedModel = attributes?.agentModelId;
        const requestedReasoning = attributes?.agentReasoning;
        const modelId = isAgentModelId(requestedModel) ? requestedModel : defaultModelId;
        const model = AGENT_MODEL_OPTIONS.find((option) => option.id === modelId);

        return {
          model: createAgentModel(modelId, isAgentReasoningLevel(requestedReasoning) ? requestedReasoning : undefined),
          modelContextWindowTokens: model?.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW_TOKENS,
          modelOptions: {
            providerOptions: {
              openai: {
                ...(isAgentReasoningLevel(requestedReasoning)
                  ? { reasoningEffort: requestedReasoning }
                  : {}),
                // Eve owns durable history, so never depend on provider-side item storage.
                store: false,
              },
            },
          },
        };
      },
    },
  }),
  modelContextWindowTokens: evalContextWindowTokens,
  modelOptions: {
    providerOptions: {
      openai: { store: false },
    },
  },
  reasoning: "provider-default",
  compaction: {
    thresholdPercent: 0.82,
  },
  limits: {
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 200_000,
  },
  ...(workflowWorld
    ? {
        experimental: {
          workflow: { world: workflowWorld },
        },
      }
    : {}),
});
