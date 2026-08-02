import type { LanguageModelMiddleware } from "ai";

export class EveOwnedProviderAttemptError extends Error {
  constructor(cause: unknown) {
    super(providerErrorMessage(cause), { cause });
    this.name = "EveOwnedProviderAttemptError";
  }
}

export class ProviderStreamInterruptedError extends Error {
  constructor() {
    super("The model Provider stream ended before completion.");
    this.name = "ProviderStreamInterruptedError";
  }
}

export const eveOwnedProviderRetryMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v4",
  wrapGenerate: ({ doGenerate }) => oneProviderAttempt(doGenerate),
  wrapStream: async ({ doStream }) => {
    const result = await oneProviderAttempt(doStream);
    return { ...result, stream: preventReplayAfterStreamStarts(result.stream) };
  },
};

export async function oneProviderAttempt<T>(operation: () => PromiseLike<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new EveOwnedProviderAttemptError(error);
  }
}

function providerErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "The model Provider request failed.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function preventReplayAfterStreamStarts<T>(stream: ReadableStream<T>): ReadableStream<T> {
  const reader = stream.getReader();
  let receivedProviderOutput = false;
  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          controller.close();
          return;
        }
        const part = result.value;
        if (receivedProviderOutput && isStreamErrorPart(part)) {
          controller.enqueue({ ...part, error: new ProviderStreamInterruptedError() });
          return;
        }
        if (!isStreamErrorPart(part)) receivedProviderOutput = true;
        controller.enqueue(part);
      } catch (error) {
        if (isAbortError(error) || !receivedProviderOutput) {
          controller.error(error);
          return;
        }
        controller.error(new ProviderStreamInterruptedError());
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

function isStreamErrorPart(value: unknown): value is { readonly type: "error"; readonly error: unknown } {
  return typeof value === "object" && value !== null && "type" in value && value.type === "error";
}
