import type { LanguageModelMiddleware } from "ai";

export function providerOutputBudgetMiddleware(
  maximumTokens: number,
): LanguageModelMiddleware {
  return {
    specificationVersion: "v4",
    transformParams: async ({ params }) => ({
      ...params,
      maxOutputTokens: boundedProviderMaxOutputTokens(
        params.maxOutputTokens,
        maximumTokens,
      ),
    }),
  };
}

export function boundedProviderMaxOutputTokens(
  requestedTokens: number | undefined,
  maximumTokens: number,
): number {
  return requestedTokens === undefined
    ? maximumTokens
    : Math.min(requestedTokens, maximumTokens);
}
