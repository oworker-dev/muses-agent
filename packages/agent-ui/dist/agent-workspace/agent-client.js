import { Client } from "eve/client";
export function createAgentSession(config, preferences, state) {
    return new Client({
        auth: config?.auth,
        headers: async () => {
            const currentPreferences = typeof preferences === "function" ? preferences() : preferences;
            return {
                ...(await resolveHeaders(config?.headers)),
                "x-agent-model": currentPreferences.modelId,
                "x-agent-reasoning": currentPreferences.reasoning,
            };
        },
        host: config?.host ?? "",
        preserveCompletedSessions: true,
        redirect: config?.redirect,
    }).session(state);
}
async function resolveHeaders(headers) {
    if (!headers)
        return {};
    return typeof headers === "function" ? await headers() : headers;
}
//# sourceMappingURL=agent-client.js.map