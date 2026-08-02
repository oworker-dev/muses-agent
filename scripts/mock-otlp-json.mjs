import http from "node:http";

const port = Number(process.env.MOCK_OTLP_PORT || 4318);
const requests = [];

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/v1/traces") {
    const body = await readBody(request);
    requests.push({ body, contentType: request.headers["content-type"] || "" });
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}\n");
    return;
  }
  if (request.method === "GET" && request.url === "/debug/traces") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ requests }));
    return;
  }
  if (request.method === "DELETE" && request.url === "/debug/traces") {
    requests.length = 0;
    response.writeHead(204).end();
    return;
  }
  response.writeHead(404).end();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock OTLP/JSON collector listening on ${port}`);
});

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
