import { expect, test } from "@playwright/test";
import { Client, type HandleMessageStreamEvent } from "eve/client";

const AGENT_WEB_URL = process.env.AGENT_WEB_URL ?? "http://127.0.0.1:3000";

test("wide workspace supports navigation, search, settings, and multiple threads", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New task", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();

  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.locator("aside").getByText("New task", { exact: true })).toHaveCount(3);
  await expect(page.locator('aside [aria-current="page"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Search tasks" }).click();
  await page.getByPlaceholder("Search task history").fill("missing task");
  await expect(page.getByText("No matching tasks")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Software task", { exact: true })).toBeVisible();
  await expect(page.getByText("No MCP connections are configured.")).toBeVisible();
  await page.getByRole("button", { name: "简体中文" }).click();
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "描述一个任务" })).toBeVisible();

  const composer = page.getByRole("textbox", { name: "描述一个任务" });
  await composer.fill("/");
  await expect(page.getByText("技能与命令")).toBeVisible();
  await expect(page.getByText("/software-task", { exact: true })).toBeVisible();
  await composer.press("Enter");
  await expect(composer).toHaveValue("/software-task ");
  await composer.fill("@");
  await expect(page.getByText("工作区上下文")).toBeVisible();
  await composer.press("Tab");
  await expect(composer).toHaveValue("@workspace ");

  await page.screenshot({ fullPage: true, path: "/tmp/muses-agent-wide.png" });
});

test("composer clears immediately while a turn is still being accepted", async ({ page }) => {
  await page.route("**/eve/v1/session", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "slow-token", sessionId: "slow-session" }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/eve/v1/session/slow-session/stream**", async (route) => {
    await route.fulfill({
      body: mockSuccessfulTurn("A delayed request", "Accepted."),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });
  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("A delayed request");
  await composer.press("Enter");
  await expect(composer).toHaveValue("", { timeout: 300 });
  await expect(page.getByRole("log").getByText("A delayed request", { exact: true })).toBeVisible({ timeout: 300 });
  await expect(page.getByText("Accepted.", { exact: true })).toBeVisible({ timeout: 5_000 });
});

test("small workspace keeps the conversation focused and opens navigation on demand", async ({ page }) => {
  await page.setViewportSize({ height: 969, width: 600 });
  await page.goto("/");

  const sidebar = page.locator("aside");
  const closedBox = await sidebar.boundingBox();
  expect(closedBox?.x).toBeLessThan(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
  const openBox = await sidebar.boundingBox();
  expect(openBox?.x).toBe(0);
  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();

  await page.screenshot({ fullPage: true, path: "/tmp/muses-agent-small.png" });
});

test("narrow mobile workspace keeps menus inside the viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  await page.getByRole("button", { name: "Model" }).click();
  const modelDialog = page.getByRole("dialog");
  await expect(modelDialog).toBeVisible();
  const dialogBox = await modelDialog.boundingBox();
  expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
  expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");

  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("/");
  await expect(page.getByText("Skills and commands")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ fullPage: true, path: "/tmp/muses-agent-mobile.png" });
});

test("a real conversation survives refresh and continues with the latest token", async ({ page }) => {
  test.skip(process.env.RUN_AGENT_LIVE_E2E !== "1", "Requires a healthy live model provider.");
  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });

  await composer.fill("Reply with exactly: web agent ready");
  await composer.press("Enter");
  await expect(page.getByText("web agent ready", { exact: true })).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "Context" }).hover();
  await expect(page.getByText("Cache read", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("web agent ready", { exact: true })).toBeVisible();
  await composer.fill("Now reply exactly: continuation works");
  await composer.press("Enter");
  await expect(page.getByText("continuation works", { exact: true })).toBeVisible({ timeout: 90_000 });
});

test("a transport failure exposes same-thread recovery", async ({ page }) => {
  let rejectNextSessionRequest = true;
  await page.route("**/eve/v1/session", async (route) => {
    if (rejectNextSessionRequest && route.request().method() === "POST") {
      rejectNextSessionRequest = false;
      await route.abort("connectionfailed");
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-token", sessionId: "mock-recovery-session" }),
      contentType: "application/json",
      headers: { "x-eve-session-id": "mock-recovery-session" },
      status: 200,
    });
  });
  await page.route("**/eve/v1/session/mock-recovery-session/stream**", async (route) => {
    await route.fulfill({
      body: mockSuccessfulTurn("Continue from the previous request and recover from the failed turn.", "Transport recovered."),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });
  await page.goto("/");

  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Reply with exactly: recovered turn");
  await composer.press("Enter");
  await expect(page.getByText("This turn failed")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("This turn failed")).toBeHidden({ timeout: 90_000 });
  await expect(page.getByText("Transport recovered.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 90_000 });
});

test("an in-flight turn reconnects after a hard refresh", async ({ page }) => {
  const session = new Client({
    headers: { "x-agent-model": "gpt-5.6-sol", "x-agent-reasoning": "low" },
    host: AGENT_WEB_URL,
    preserveCompletedSessions: true,
  }).session();
  const response = await session.send("Use the shell to wait 5 seconds, then reply exactly: refresh recovery ready");
  const events: HandleMessageStreamEvent[] = [];
  for await (const event of response) {
    events.push(event);
    if (event.type === "step.started") break;
  }
  expect(events.at(-1)?.type).toBe("step.started");

  const now = Date.now();
  const thread = {
    createdAt: now,
    events,
    id: "recovery-thread",
    preferences: { modelId: "gpt-5.6-sol", reasoning: "low" },
    session: session.state,
    status: "streaming",
    title: "Refresh recovery",
    updatedAt: now,
  };
  const storedCollection = JSON.stringify({
    activeThreadId: thread.id,
    threads: [thread],
    version: 1,
  });
  await page.goto("/");
  await page.evaluate((value) => localStorage.setItem("muses-agent:threads:v1", value), storedCollection);

  await page.reload();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Reconnecting to the active run...")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("muses-agent:threads:v1");
    return raw?.includes('"session.waiting"');
  })).toBeTruthy();
});

test("stop cancels server work and returns the thread to an interactive state", async ({ page }) => {
  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Use the shell to wait 20 seconds before replying. Do not skip the wait.");
  await composer.press("Enter");
  const stop = page.getByRole("button", { name: "Stop" });
  await expect(stop).toBeVisible();
  await stop.click();

  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
});

function mockSuccessfulTurn(message: string, reply: string): string {
  const at = new Date().toISOString();
  const turnId = "turn_0";
  const events = [
    { data: { runtime: { agentId: "muses-agent", agentName: "muses-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.started" },
    { data: { message, parts: [{ text: message, type: "text" }], sequence: 0, turnId }, meta: { at }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "step.started" },
    { data: { finishReason: "stop", message: reply, sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "message.completed" },
    { data: { finishReason: "stop", sequence: 0, stepIndex: 0, turnId, usage: { inputTokens: 1, outputTokens: 1 } }, meta: { at }, type: "step.completed" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.completed" },
    { data: { continuationToken: "mock-token-1", wait: "next-user-message" }, meta: { at }, type: "session.waiting" },
  ];
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}
