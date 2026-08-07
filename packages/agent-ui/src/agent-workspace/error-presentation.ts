export function sanitizeAgentError(message: string): string {
  return message
    .replace(/(["']?base[_ -]?url["']?\s*[:=]\s*)["']?https?:\/\/[^\s,"'}]+["']?/giu, "$1[hidden]")
    .replace(/https?:\/\/[^\s)\]}>"']+/giu, "[provider endpoint hidden]");
}
