const collectorUrl = process.env.OTEL_TEST_COLLECTOR_URL || "http://127.0.0.1:4318";
const probe = process.env.OTEL_TEST_PRIVATE_PROBE;

if (!probe) throw new Error("OTEL_TEST_PRIVATE_PROBE is required.");

const deadline = Date.now() + 15_000;
let requests = [];
while (Date.now() < deadline) {
  const response = await fetch(`${collectorUrl}/debug/traces`);
  const payload = await response.json();
  requests = Array.isArray(payload.requests) ? payload.requests : [];
  if (requests.length > 0) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const decoded = requests.flatMap((request) => {
  try {
    return [JSON.parse(request.body)];
  } catch {
    return [];
  }
});
const spans = decoded.flatMap((payload) =>
  (payload.resourceSpans || []).flatMap((resourceSpan) => {
    const serviceName = attributeValue(resourceSpan.resource?.attributes, "service.name");
    return (resourceSpan.scopeSpans || []).flatMap((scopeSpan) =>
      (scopeSpan.spans || []).map((span) => ({ ...span, serviceName })),
    );
  }),
);
if (spans.length === 0) throw new Error("The collector did not receive any OTLP spans.");

const serialized = JSON.stringify(decoded);
if (serialized.includes(probe)) {
  throw new Error("A private prompt or model output was exported in an OpenTelemetry span.");
}

const agentSpans = spans.filter((span) => span.serviceName === "muses-agent");
const webSpans = spans.filter((span) => span.serviceName === "muses-agent-web");
if (agentSpans.length === 0) throw new Error("No Eve Agent runtime spans were exported.");
if (webSpans.length === 0) throw new Error("No Agent Web service spans were exported.");

const webSpanContexts = new Set(webSpans.map((span) => `${span.traceId}:${span.spanId}`));
const ingressSpans = agentSpans.filter((span) => span.name === "muses.agent.turn.accepted");
const linkedIngress = ingressSpans.find((span) =>
  (span.links || []).some((link) => webSpanContexts.has(`${link.traceId}:${link.spanId}`)),
);
if (!linkedIngress) {
  throw new Error("The durable Agent turn did not link back to the Agent Web W3C span context.");
}
const turnTraceJoined = agentSpans.some(
  (span) => span.name === "ai.eve.turn" && span.traceId === linkedIngress.traceId,
);
if (!turnTraceJoined) {
  throw new Error("The Agent ingress link and Eve turn were not recorded in the same Agent trace.");
}

const runtimeAttributes = linkedIngress.attributes || [];
for (const name of [
  "muses.agent.run_id",
  "muses.agent.correlation_id",
  "muses.agent.profile_id",
  "muses.agent.session_id",
]) {
  if (!runtimeAttributes.some((attribute) => attribute.key === name && anyValue(attribute.value) !== "")) {
    throw new Error(`Agent runtime spans are missing correlation attribute ${name}.`);
  }
}

console.log(JSON.stringify({
  durableTraceLink: true,
  privateContentExported: false,
  requestCount: requests.length,
  services: [...new Set(spans.map((span) => span.serviceName).filter(Boolean))].sort(),
  spanCount: spans.length,
}));

function attributeValue(attributes, key) {
  const attribute = (attributes || []).find((candidate) => candidate.key === key);
  return attribute ? anyValue(attribute.value) : undefined;
}

function anyValue(value) {
  if (!value || typeof value !== "object") return undefined;
  return value.stringValue ?? value.intValue ?? value.doubleValue ?? value.boolValue;
}
