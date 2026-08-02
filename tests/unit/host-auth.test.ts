import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenError } from "eve/channels/auth";

import { hostJwtAuth, hostJwtAuthFromEnvironment } from "../../agent/lib/host-auth.ts";

const SECRET = "01234567890123456789012345678901";

test("accepts a host JWT and projects tenant identity", async () => {
  const auth = hostJwtAuth({
    audiences: ["muses-agent"],
    issuer: "https://muses.example.test",
    secret: SECRET,
  });

  const result = await auth(new Request("https://agent.example.test/eve/v1/session", {
    headers: {
      authorization: `Bearer ${signJwt({
        actorType: "user",
        aud: "muses-agent",
        exp: Math.floor(Date.now() / 1000) + 300,
        iss: "https://muses.example.test",
        projectId: "project-123",
        canvasId: "canvas-123",
        sub: "user-123",
        tenantId: "workspace-123",
      })}`,
    },
  }));

  assert.ok(result);
  assert.equal(result.authenticator, "host-jwt");
  assert.equal(result.principalType, "user");
  assert.equal(result.attributes.tenantId, "workspace-123");
  assert.equal(result.attributes.projectId, "project-123");
  assert.equal(result.attributes.canvasId, "canvas-123");
  assert.equal(result.subject, "user-123");
  assert.equal(result.principalId, "https://muses.example.test:user-123");
});

test("rejects a verified host token without a tenant scope", async () => {
  const auth = hostJwtAuth({
    audiences: ["muses-agent"],
    issuer: "https://muses.example.test",
    secret: SECRET,
  });

  await assert.rejects(
    async () => await auth(new Request("https://agent.example.test/eve/v1/session", {
      headers: {
        authorization: `Bearer ${signJwt({
          aud: "muses-agent",
          exp: Math.floor(Date.now() / 1000) + 300,
          iss: "https://muses.example.test",
          sub: "user-123",
        })}`,
      },
    })),
    (error: unknown) => error instanceof ForbiddenError,
  );
});

test("allows local development to fall through when host JWT auth is not configured", async () => {
  const auth = hostJwtAuthFromEnvironment({});
  assert.equal(await auth(new Request("http://127.0.0.1:3100/eve/v1/session")), null);
});

function signJwt(payload: Record<string, string | number>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodePart(header);
  const encodedPayload = encodePart(payload);
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
