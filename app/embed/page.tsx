import { AgentEmbed } from "./embed-client";

export const dynamic = "force-dynamic";

export default function EmbedPage() {
  return <AgentEmbed allowedOrigins={allowedEmbedOrigins()} />;
}

function allowedEmbedOrigins(): readonly string[] {
  const configured = process.env.AGENT_EMBED_ALLOWED_ORIGINS?.trim();
  if (configured) return configured.split(",").map((origin) => new URL(origin.trim()).origin);
  return process.env.NODE_ENV === "development"
    ? ["http://localhost:4730", "http://127.0.0.1:4730"]
    : [];
}
