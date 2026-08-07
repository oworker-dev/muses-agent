import assert from "node:assert/strict";
import test from "node:test";
import webFetch from "../../agent/tools/web_fetch.ts";

const context = { abortSignal: new AbortController().signal } as Parameters<typeof webFetch.execute>[1];

test("web_fetch keeps binary responses out of model text", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([0, 255, 12, 42]), {
    headers: { "content-type": "image/png" },
    status: 200,
  });
  try {
    const result = await webFetch.execute({ url: "https://assets.example/image.png" }, context) as WebFetchOutput;
    assert.equal(result.binary, true);
    assert.equal(result.content, "");
    assert.equal(result.byteLength, 4);
    const projected = await webFetch.toModelOutput?.(result);
    assert.equal(projected?.type, "text");
    assert.match(projected?.type === "text" ? projected.value : "", /No binary bytes/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("web_fetch bounds textual output", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(70_000), {
    headers: { "content-type": "text/plain" },
    status: 200,
  });
  try {
    const result = await webFetch.execute({ url: "https://docs.example/page" }, context) as WebFetchOutput;
    assert.equal(result.binary, false);
    assert.equal(result.content.length, 50 * 1024);
    assert.equal(result.truncated, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

type WebFetchOutput = {
  readonly binary: boolean;
  readonly byteLength: number;
  readonly content: string;
  readonly contentType: string;
  readonly truncated: boolean;
  readonly url: string;
};
