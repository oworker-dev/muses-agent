import { Client } from "eve/client";
export function createAgentSession(config, preferences, state) {
    const headers = async () => {
        const currentPreferences = typeof preferences === "function" ? preferences() : preferences;
        return {
            ...(await resolveHeaders(config?.headers)),
            "x-agent-execution-mode": currentPreferences.executionMode ?? "standard",
            "x-agent-model": currentPreferences.modelId,
            "x-agent-reasoning": currentPreferences.reasoning,
        };
    };
    const host = config?.host ?? "";
    const client = new Client({
        auth: config?.auth,
        headers,
        host,
        redirect: config?.redirect,
    });
    const initialSession = state?.sessionId
        ? { sessionId: state.sessionId, streamIndex: state.streamIndex ?? 0 }
        : undefined;
    return {
        ...(config?.auth ? { auth: config.auth } : {}),
        client,
        headers,
        host,
        ...(initialSession ? { initialSession } : {}),
    };
}
export function attachAgentSession(connection, state) {
    return state
        ? connection.client.sessions.attach(state.sessionId, { streamIndex: state.streamIndex })
        : undefined;
}
async function resolveHeaders(headers) {
    if (!headers)
        return {};
    return typeof headers === "function" ? await headers() : headers;
}
//# sourceMappingURL=agent-client.js.map