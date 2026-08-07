export type StandaloneStorageMode = "browser" | "server";

export function resolveStandaloneStorageMode(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): StandaloneStorageMode {
  if (environment.AGENT_DATABASE_URL?.trim()) return "server";

  // Production preflight requires PostgreSQL. Keep the server boundary active
  // there so a broken deployment fails visibly instead of silently becoming a
  // browser-local product. Local development has an intentional storage
  // fallback and should not call an endpoint known to be unavailable.
  return environment.NODE_ENV === "production" ? "server" : "browser";
}
