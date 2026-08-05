import { createArtifactStoreFromEnvironment } from "@/server/data/artifact-store";
import { assertArtifactId, verifyArtifactToken } from "@/lib/preview-token";

export const runtime = "nodejs";

type RouteContext = { readonly params: Promise<{ readonly artifactId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { artifactId: rawArtifactId } = await context.params;
  let artifactId: string;
  try {
    artifactId = assertArtifactId(rawArtifactId);
  } catch {
    return response(404, "Artifact not found.");
  }
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !verifyArtifactToken(token, artifactId)) {
    return response(401, "Artifact access is invalid or expired.");
  }
  const store = createArtifactStoreFromEnvironment();
  const artifact = await store.find(artifactId);
  if (!artifact || Date.parse(artifact.expiresAt) <= Date.now()) return response(404, "Artifact not found.");
  const file = await store.read(artifactId);
  if (!file) return response(404, "Artifact not found.");
  const body = new Uint8Array(file.content.byteLength);
  body.set(file.content);
  return new Response(body.buffer, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="${safeHeaderFilename(file.filename)}"`,
      "content-security-policy": "default-src 'none'; img-src data:; media-src data:",
      "content-type": file.mediaType,
      "cross-origin-resource-policy": "cross-origin",
      "x-content-type-options": "nosniff",
    },
  });
}

function response(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
  });
}

function safeHeaderFilename(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}
