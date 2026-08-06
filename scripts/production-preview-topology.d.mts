export const PRODUCTION_PREVIEW_PORTS: Readonly<{
  readonly eve: 4275;
  readonly web: 3000;
}>;

export function configureEveNextProductionPort(
  environment?: Record<string, string | undefined>,
): number;

export function assertBuiltEveProxy(
  routesManifest: unknown,
  expectedPort: number,
): void;

export function assertBuiltEveWorkflowWorld(
  compiledAgentManifest: unknown,
  expectedWorld?: string,
): void;
