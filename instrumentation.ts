import { registerOTel } from "@vercel/otel";

export function register(): void {
  registerOTel({
    serviceName: "muses-agent-web",
    instrumentationConfig: {
      fetch: {
        propagateContextUrls: configuredOrigins([
          process.env.AGENT_RUNTIME_URL,
          process.env.AGENT_HOST_TOOLS_URL,
        ]),
      },
    },
  });
}

function configuredOrigins(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.flatMap((value) => {
    if (!value?.trim()) return [];
    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  }))];
}
