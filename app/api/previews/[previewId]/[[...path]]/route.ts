import { createPreviewStoreFromEnvironment } from "@/server/data/preview-store";
import {
  authenticatePreviewRequest,
  recoverOwnedPreviewRequest,
} from "@/server/http/preview-request-auth";
import { assertPreviewId } from "@/lib/preview-token";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly path?: string[]; readonly previewId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { path, previewId: rawPreviewId } = await context.params;
  let previewId: string;
  try {
    previewId = assertPreviewId(rawPreviewId);
  } catch {
    return response(404, "Preview not found.");
  }
  const store = createPreviewStoreFromEnvironment();
  const preview = await store.find(previewId);
  if (!preview || Date.parse(preview.expiresAt) <= Date.now()) return response(404, "Preview not found.");
  const access = authenticatePreviewRequest(request, previewId) ??
    recoverOwnedPreviewRequest(request, preview);
  if (!access) return response(401, "Preview access is invalid or expired.");
  const requested = path?.length ? path.join("/") : preview.entrypoint;
  if (!safePath(requested)) return response(404, "Preview file not found.");
  const file = await store.readFile(previewId, requested);
  if (!file) return response(404, "Preview file not found.");
  const body = new Uint8Array(file.content.byteLength);
  body.set(file.content);
  return new Response(body.buffer, {
    headers: {
      "cache-control": "private, no-store",
      "content-security-policy": [
        "default-src 'self' data: blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https:",
        "font-src 'self' data: https:",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https:",
        "connect-src 'self' https: wss:",
        "frame-src https:",
      ].join("; "),
      "content-type": file.mediaType,
      "cross-origin-resource-policy": "cross-origin",
      "referrer-policy": "no-referrer",
      ...(access.setCookie ? { "set-cookie": access.setCookie } : {}),
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

function safePath(value: string): boolean {
  return value.length > 0 && value.length <= 512 && !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes("..") && !value.split("/").includes("");
}
