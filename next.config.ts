import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{
      source: "/embed",
      headers: [{
        key: "Content-Security-Policy",
        value: `frame-ancestors ${frameAncestorPolicy()}`,
      }],
    }];
  },
};

function frameAncestorPolicy(): string {
  const configured = process.env.AGENT_EMBED_ALLOWED_ORIGINS?.trim();
  if (configured) {
    const origins = configured.split(",").map((value) => new URL(value.trim()).origin);
    return [...new Set(origins)].join(" ");
  }
  return process.env.NODE_ENV === "development"
    ? "http://localhost:4730 http://127.0.0.1:4730"
    : "'none'";
}

export default withEve(nextConfig);
