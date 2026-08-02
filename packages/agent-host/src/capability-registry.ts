import type { AgentHostCapabilityDescriptor } from "@muses/agent-contracts/host-capability";
import type { JsonValue } from "@muses/agent-contracts/agent-run";

export type AgentHostCapabilityRegistration<TContext> = {
  readonly descriptor: AgentHostCapabilityDescriptor;
  readonly invoke: (
    input: Readonly<Record<string, JsonValue>>,
    context: TContext,
  ) => JsonValue | Promise<JsonValue>;
  readonly validate?: (input: unknown) => input is Readonly<Record<string, JsonValue>>;
};

export interface AgentHostCapabilityRegistry<TContext> {
  list(): readonly AgentHostCapabilityDescriptor[];
  invoke(name: string, input: unknown, context: TContext): Promise<JsonValue>;
}

export function createAgentHostCapabilityRegistry<TContext>(
  registrations: readonly AgentHostCapabilityRegistration<TContext>[],
): AgentHostCapabilityRegistry<TContext> {
  const byName = new Map<string, AgentHostCapabilityRegistration<TContext>>();
  for (const registration of registrations) {
    const name = registration.descriptor.name.trim();
    if (!name) throw new Error("Host capability name is required.");
    if (byName.has(name)) throw new Error(`Host capability "${name}" is registered more than once.`);
    byName.set(name, registration);
  }
  const descriptors = [...byName.values()]
    .map((registration) => registration.descriptor)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    list: () => descriptors,
    async invoke(name, input, context) {
      const registration = byName.get(name);
      if (!registration) throw new AgentHostCapabilityNotFoundError(name);
      if (!isRecord(input) || registration.validate && !registration.validate(input)) {
        throw new AgentHostCapabilityInputError(name);
      }
      return registration.invoke(input, context);
    },
  };
}

export class AgentHostCapabilityNotFoundError extends Error {
  constructor(readonly capability: string) {
    super(`Host capability "${capability}" is not registered.`);
    this.name = "AgentHostCapabilityNotFoundError";
  }
}

export class AgentHostCapabilityInputError extends Error {
  constructor(readonly capability: string) {
    super(`Host capability "${capability}" received invalid input.`);
    this.name = "AgentHostCapabilityInputError";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, JsonValue>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
