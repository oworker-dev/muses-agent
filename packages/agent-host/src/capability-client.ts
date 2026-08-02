import type { AgentHostInvocationIdentity } from "@muses/agent-contracts/host";
import {
  AGENT_HOST_CAPABILITY_CONTRACT_VERSION,
  type AgentHostCapabilitiesResponse,
  type AgentHostCapabilityDescriptor,
  type AgentHostCapabilityInvokeRequest,
  type AgentHostCapabilityInvokeResponse,
} from "@muses/agent-contracts/host-capability";
import type { JsonValue } from "@muses/agent-contracts/agent-run";
import { signAgentHostCapabilityRequest } from "./capability-signature.js";

export type AgentHostCapabilityClientOptions = {
  readonly baseUrl: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly identity: AgentHostInvocationIdentity | (() => AgentHostInvocationIdentity | Promise<AgentHostInvocationIdentity>);
  readonly now?: () => number;
  readonly secret: string | (() => string | Promise<string>);
  readonly timeoutMs?: number;
};

export interface AgentHostCapabilityClient {
  list(options?: { readonly signal?: AbortSignal }): Promise<readonly AgentHostCapabilityDescriptor[]>;
  invoke(
    input: AgentHostCapabilityInvokeRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<AgentHostCapabilityInvokeResponse>;
}

export function createAgentHostCapabilityClient(
  options: AgentHostCapabilityClientOptions,
): AgentHostCapabilityClient {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (typeof fetchImplementation !== "function") throw new Error("A Fetch API implementation is required.");
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new RangeError("Host capability timeout must be from 1000 to 120000 milliseconds.");
  }

  async function request(path: string, init: RequestInit) {
    const url = new URL(path.replace(/^\//, ""), `${baseUrl}/`);
    const body = init.body ? String(init.body) : "";
    const [identity, secret] = await Promise.all([resolve(options.identity), resolve(options.secret)]);
    const signedHeaders = signAgentHostCapabilityRequest({
      body,
      identity,
      method: init.method ?? "GET",
      secret,
      timestamp: options.now?.(),
      url,
    });
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    const response = await fetchImplementation(url, {
      ...init,
      headers: {
        accept: "application/json",
        ...init.headers,
        ...signedHeaders,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      redirect: "error",
      signal,
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new AgentHostCapabilityHttpError(
        response.status,
        errorMessage(payload) ?? `The Host capability service returned HTTP ${response.status}.`,
        payload,
      );
    }
    return payload;
  }

  return {
    async list(requestOptions) {
      const payload = await request("capabilities", { method: "GET", signal: requestOptions?.signal });
      if (
        !isRecord(payload) ||
        payload.contractVersion !== AGENT_HOST_CAPABILITY_CONTRACT_VERSION ||
        !Array.isArray(payload.capabilities)
      ) {
        throw contractError(payload);
      }
      return (payload as AgentHostCapabilitiesResponse).capabilities;
    },
    async invoke(input, requestOptions) {
      const payload = await request("invoke", {
        body: JSON.stringify(input),
        method: "POST",
        signal: requestOptions?.signal,
      });
      if (
        !isRecord(payload) ||
        payload.contractVersion !== AGENT_HOST_CAPABILITY_CONTRACT_VERSION ||
        payload.capability !== input.capability ||
        !("output" in payload)
      ) {
        throw contractError(payload);
      }
      return payload as AgentHostCapabilityInvokeResponse;
    },
  };
}

export class AgentHostCapabilityHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "AgentHostCapabilityHttpError";
  }
}

export class AgentHostCapabilityContractError extends Error {
  constructor(readonly body: unknown) {
    super(`Host capability response does not match contract ${AGENT_HOST_CAPABILITY_CONTRACT_VERSION}.`);
    this.name = "AgentHostCapabilityContractError";
  }
}

function normalizeBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Host capability base URL must use HTTP or HTTPS.");
  }
  return normalized;
}

async function resolve<T>(value: T | (() => T | Promise<T>)): Promise<T> {
  return typeof value === "function" ? (value as () => T | Promise<T>)() : value;
}

function contractError(body: unknown) {
  return new AgentHostCapabilityContractError(body);
}

function errorMessage(body: unknown) {
  if (!isRecord(body)) return undefined;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type AgentHostCapabilityInvocation = {
  readonly capability: string;
  readonly correlationId?: string;
  readonly input: Readonly<Record<string, JsonValue>>;
  readonly runId: string;
  readonly sessionId: string;
};
