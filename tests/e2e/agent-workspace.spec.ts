import { expect, test, type Page } from "@playwright/test";
const threadStores = new WeakMap<Page, FakeThreadStore>();

test.beforeEach(async ({ page }) => {
  const store: FakeThreadStore = {
    collection: { threads: [], version: 1 },
    revision: 0,
  };
  threadStores.set(page, store);
  await page.route("**/api/standalone/thread-collections/**", async (route) => {
    if (route.request().method() === "PUT") {
      const expected = Number((route.request().headers()["if-match"] ?? "").replaceAll('"', ""));
      if (expected !== store.revision) {
        await route.fulfill({
          body: JSON.stringify({ code: "thread_collection_conflict", ok: false }),
          contentType: "application/json",
          headers: { etag: `"${store.revision}"` },
          status: 409,
        });
        return;
      }
      const body = route.request().postDataJSON() as { collection: unknown };
      store.collection = body.collection as FakeThreadCollection;
      store.revision += 1;
    }
    await route.fulfill({
      body: JSON.stringify({ collection: store.collection, revision: store.revision }),
      contentType: "application/json",
      headers: { etag: `"${store.revision}"` },
      status: 200,
    });
  });
});

test("wide workspace supports navigation, search, settings, and multiple threads", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
  await expect(page.locator("aside").getByRole("button", { name: "New task", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();
  await expect(page).toHaveURL(/\/threads\/[0-9a-f-]+$/);

  await page.locator("aside").getByRole("button", { name: "New task", exact: true }).first().click();
  await expect(page.locator("aside").getByText("New task", { exact: true })).toHaveCount(3);
  await expect(page.locator('aside [aria-current="page"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Search tasks" }).click();
  await page.getByPlaceholder("Search task history").fill("missing task");
  await expect(page.getByText("No matching tasks")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Software task", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No MCP connections are configured.")).toBeVisible();
  await page.getByRole("button", { name: "简体中文" }).click();
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "描述一个任务" })).toBeVisible();

  const composer = page.getByRole("textbox", { name: "描述一个任务" });
  await composer.fill("/");
  await expect(page.getByText("技能与命令")).toHaveCount(0);
  await expect(composer).toHaveValue("/");
  await composer.fill("@");
  await expect(page.getByText("工作区上下文")).toBeVisible();
  await composer.press("Tab");
  await expect(composer).toHaveValue("@workspace ");

  await page.screenshot({ fullPage: true, path: "/tmp/open-agent-wide.png" });
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

  await page.screenshot({ fullPage: true, path: "/tmp/open-agent-small.png" });
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
  await composer.fill("@");
  await expect(page.getByText("Workspace context")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ fullPage: true, path: "/tmp/open-agent-mobile.png" });
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

test("tool work collapses into one timed execution cycle and keeps the final delivery visible", async ({ page }) => {
  const sessionId = "mock-tool-cycle-session";
  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-tool-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    await route.fulfill({
      body: mockToolTurn("Build a website", "The website is ready."),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Build a website");
  await composer.press("Enter");

  const execution = page.getByRole("button", { name: /Worked for/u });
  await expect(execution).toBeVisible();
  await expect(page.getByText("The website is ready.", { exact: true })).toBeVisible();
  await expect(page.getByText("Inspecting the workspace.", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Context" })).not.toContainText("0%");

  await execution.click();
  await expect(page.getByText("Inspecting the workspace.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Terminal command/u })).toBeVisible();
});

test("a live autonomous website task survives refresh and publishes a usable preview", async ({ page }) => {
  test.skip(process.env.RUN_AGENT_AUTONOMY_E2E !== "1", "Requires a healthy live model provider and sandbox.");
  test.setTimeout(20 * 60_000);
  await page.unroute("**/api/standalone/thread-collections/**");
  await page.goto("/");

  const prompt = [
    "Build a polished responsive one-page enterprise website for Aperture Systems in the sandbox.",
    "Include a navigation bar, a strong hero, three product capabilities, customer proof, and a contact call to action.",
    "Use plain HTML, CSS, and JavaScript, validate the result, then publish it with the website preview tool.",
    "Work autonomously and finish by giving me the working preview link.",
  ].join(" ");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill(prompt);
  await composer.press("Enter");
  await expect(composer).toHaveValue("", { timeout: 1_000 });
  await expect(page.getByText(prompt, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/threads\/[0-9a-f-]+$/u);
  const threadUrl = page.url();

  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(page.url()).toBe(threadUrl);
  await expect(page.getByText(prompt, { exact: true })).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 18 * 60_000 });
  const previewTool = page.getByRole("button", { name: /publish_preview/u }).last();
  await expect(previewTool).toBeVisible();
  await previewTool.click();
  const previewLink = page.getByRole("link", { name: "Open preview" }).last();
  await expect(previewLink).toBeVisible();
  const href = await previewLink.getAttribute("href");
  expect(href).toBeTruthy();
  const published = new URL(href!, page.url());
  const localPreview = new URL(`${published.pathname}${published.search}`, "http://127.0.0.1:3000");
  const previewPage = await page.context().newPage();
  const previewResponses: Array<{ readonly status: number; readonly url: string }> = [];
  previewPage.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith(`/api/previews/${encodeURIComponent(previewToolId(published))}/`)) {
      previewResponses.push({ status: response.status(), url: response.url() });
    }
  });
  const response = await previewPage.goto(localPreview.toString(), { waitUntil: "networkidle" });
  expect(response?.ok()).toBeTruthy();
  expect((await previewPage.locator("body").innerText()).toLowerCase()).toContain("aperture systems");
  expect(previewResponses.some(({ url }) => new URL(url).pathname.endsWith(".css"))).toBeTruthy();
  expect(previewResponses.some(({ url }) => new URL(url).pathname.endsWith(".js"))).toBeTruthy();
  expect(previewResponses.filter(({ status }) => status >= 400)).toEqual([]);
  await previewPage.close();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
});

function previewToolId(url: URL): string {
  const match = /^\/api\/previews\/([^/]+)\//u.exec(url.pathname);
  if (!match?.[1]) throw new Error("The preview URL does not contain a preview id.");
  return decodeURIComponent(match[1]);
}

test("a transport failure preserves the original request without inventing a continuation prompt", async ({ page }) => {
  await page.route("**/eve/v1/session", async (route) => {
    await route.abort("connectionfailed");
  });
  await page.goto("/");

  const composer = page.getByRole("textbox", { name: "Describe a task" });
  const original = "Build the enterprise website and publish a preview";
  await composer.fill(original);
  await composer.press("Enter");
  await expect(page.getByText("This turn failed")).toBeVisible();
  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await expect(page.getByText("Your original request is preserved in this task.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();
});

test("a slow Provider does not force the live Agent stream into recovery", async ({ page }) => {
  const sessionId = "mock-slow-provider-session";
  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-slow-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    await route.fulfill({
      body: mockSuccessfulTurn("Run a slow task", "Slow task completed."),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Run a slow task");
  await composer.press("Enter");
  await expect(composer).toBeDisabled();
  const activity = page.getByRole("status").filter({ hasText: "Starting task" });
  await expect(activity).toBeVisible();
  await expect(activity).toHaveText("Starting task");
  await page.waitForTimeout(8_500);
  await expect(page.getByText("Reconnecting to the active run...")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();
  await expect(page.getByText("Slow task completed.", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeEnabled();
});

test("a proxied child approval stays attached to the parent task and resumes it", async ({ page }) => {
  const sessionId = "mock-child-approval-session";
  const initialEvents = mockChildApprovalEvents();
  let responseBody: unknown;
  setFakeThreadCollection(page, {
    activeThreadId: "child-approval-thread",
    threads: [{
      createdAt: Date.now(),
      events: initialEvents,
      id: "child-approval-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      session: {
        continuationToken: "mock-child-approval-token",
        sessionId,
        streamIndex: initialEvents.length,
      },
      status: "waiting",
      title: "Delegated website task",
      updatedAt: Date.now(),
    }],
    version: 1,
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    responseBody = route.request().postDataJSON();
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-resumed-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    await route.fulfill({
      body: mockChildApprovalResumeEvents(),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/threads/child-approval-thread");
  await expect(page.getByText("Waiting for approval", { exact: true })).toBeVisible();
  await expect(page.getByText("A delegated task needs your approval", { exact: true })).toBeVisible();
  await expect(page.getByText("Sub-agent is working independently", { exact: true })).toBeVisible();
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  await expect(approve).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeDisabled();

  await approve.click();
  await expect.poll(() => responseBody).toMatchObject({
    inputResponses: [{ optionId: "approve", requestId: "request-child-bash" }],
  });
  await expect(page.getByText("The delegated task resumed and completed.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Worked for/ }).click();
  await page.getByRole("button", { name: "Delegated task", exact: true }).click();
  await expect(page.getByText("Sub-agent finished and returned its result to the parent Agent", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeEnabled();
});

test("an original page catches up through bounded reads when live streams stop receiving durable progress", async ({ page }) => {
  const sessionId = "mock-stalled-browser-session";
  const at = new Date().toISOString();
  const turnId = "turn_0";
  const recoveredEvents = [
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.started" },
    { data: { message: "Run a durable task", parts: [{ text: "Run a durable task", type: "text" }], sequence: 0, turnId }, meta: { at }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "step.started" },
    { data: { finishReason: "stop", message: "Durable progress recovered.", sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "message.completed" },
    { data: { finishReason: "stop", sequence: 0, stepIndex: 0, turnId, usage: { inputTokens: 1, outputTokens: 1 } }, meta: { at }, type: "step.completed" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.completed" },
    { data: { continuationToken: "mock-stalled-token", wait: "next-user-message" }, meta: { at }, type: "session.waiting" },
  ];
  let boundedRequests = 0;
  let liveRequests = 0;

  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-stalled-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("includeTailIndex") !== "1") {
      liveRequests += 1;
      const startIndex = Number(url.searchParams.get("startIndex") ?? "0");
      const acceptedEvents = recoveredEvents.slice(startIndex, 4);
      await route.fulfill({
        body: acceptedEvents.length > 0
          ? `${acceptedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`
          : "",
        contentType: "application/x-ndjson",
        status: 200,
      });
      return;
    }
    boundedRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const startIndex = Number(url.searchParams.get("startIndex") ?? "0");
    await route.fulfill({
      body: `${recoveredEvents.slice(startIndex).map((event) => JSON.stringify(event)).join("\n")}\n`,
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(recoveredEvents.length - 1) },
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Run a durable task");
  await composer.press("Enter");

  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();
  await expect(page.getByText("Durable progress recovered.", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  expect(liveRequests).toBeGreaterThanOrEqual(1);
  expect(boundedRequests).toBeGreaterThanOrEqual(1);
});

test("large legacy incremental history hydrates quickly and is compacted", async ({ page }) => {
  const at = new Date().toISOString();
  const events = Array.from({ length: 3_000 }, (_, index) => ({
    data: {
      messageDelta: "x",
      messageSoFar: `${String(index).padStart(4, "0")}:${"x".repeat(900)}`,
      sequence: 0,
      stepIndex: 0,
      turnId: "turn_legacy",
    },
    meta: { at },
    type: "message.appended",
  }));
  setFakeThreadCollection(page, {
    activeThreadId: "legacy-thread",
    threads: [{
      createdAt: Date.now(),
      events,
      id: "legacy-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      session: { streamIndex: events.length },
      status: "ready",
      title: "Legacy history",
      updatedAt: Date.now(),
    }],
    version: 1,
  });

  const startedAt = Date.now();
  await page.goto("/threads/legacy-thread");
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible({ timeout: 5_000 });
  expect(Date.now() - startedAt).toBeLessThan(5_000);
  await expect.poll(() => threadEvents(page).length).toBe(1);
});

test("a persisted cursor past a missing UI boundary repairs from the durable tail", async ({ page }) => {
  const sessionId = "mock-missing-boundary-session";
  const at = new Date().toISOString();
  const turnId = "turn_0";
  const projectedEvents = [
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.started" },
    { data: { message: "Repair this thread", parts: [{ text: "Repair this thread", type: "text" }], sequence: 0, turnId }, meta: { at }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "step.started" },
  ];
  const waiting = { data: { continuationToken: "mock-repaired-token", wait: "next-user-message" }, meta: { at }, type: "session.waiting" };
  const absoluteTailIndex = 7;

  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("startIndex") === "-1") {
      await route.fulfill({
        body: `${JSON.stringify(waiting)}\n`,
        contentType: "application/x-ndjson",
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: "",
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(absoluteTailIndex) },
      status: 200,
    });
  });

  const now = Date.now();
  setFakeThreadCollection(page, {
    activeThreadId: "missing-boundary-thread",
    threads: [{
      createdAt: now,
      events: projectedEvents,
      id: "missing-boundary-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      session: { sessionId, streamIndex: absoluteTailIndex + 1 },
      status: "streaming",
      title: "Missing boundary",
      updatedAt: now,
    }],
    version: 1,
  });

  await page.goto("/threads/missing-boundary-thread");
  await expect(page.getByText("Reconnecting to the active run...")).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await expect.poll(() => firstStoredThread(page)?.session?.continuationToken).toBe("mock-repaired-token");
});

test("an in-flight turn reconnects after a hard refresh", async ({ page }) => {
  const sessionId = "mock-refresh-session";
  const at = new Date().toISOString();
  const turnId = "turn_0";
  const acceptedEvents = [
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.started" },
    { data: { message: "Run through refresh", parts: [{ text: "Run through refresh", type: "text" }], sequence: 0, turnId }, meta: { at }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "step.started" },
  ];
  const completedEvents = [
    ...acceptedEvents,
    { data: { finishReason: "stop", message: "Refresh recovery ready.", sequence: 0, stepIndex: 0, turnId }, meta: { at }, type: "message.completed" },
    { data: { finishReason: "stop", sequence: 0, stepIndex: 0, turnId, usage: { inputTokens: 1, outputTokens: 1 } }, meta: { at }, type: "step.completed" },
    { data: { sequence: 0, turnId }, meta: { at }, type: "turn.completed" },
    { data: { continuationToken: "mock-refresh-token", wait: "next-user-message" }, meta: { at }, type: "session.waiting" },
  ];

  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-refresh-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const url = new URL(route.request().url());
    const startIndex = Number(url.searchParams.get("startIndex") ?? "0");
    if (url.searchParams.get("includeTailIndex") === "1") {
      await new Promise((resolve) => setTimeout(resolve, 750));
      await route.fulfill({
        body: `${completedEvents.slice(startIndex).map((event) => JSON.stringify(event)).join("\n")}\n`,
        contentType: "application/x-ndjson",
        headers: { "x-eve-stream-tail-index": String(completedEvents.length - 1) },
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: startIndex === 0
        ? `${acceptedEvents.map((event) => JSON.stringify(event)).join("\n")}\n`
        : "",
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Run through refresh");
  await composer.press("Enter");
  await expect.poll(() => threadEvents(page).some((event) => isEventType(event, "step.started"))).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Reconnecting to the active run...")).toBeHidden();
  await expect(page.getByText("Refresh recovery ready.", { exact: true })).toBeVisible();
  await expect.poll(() => JSON.stringify(threadEvents(page)).includes('"session.waiting"')).toBeTruthy();
});

test("stop cancels server work and returns the thread to an interactive state", async ({ page }) => {
  const sessionId = "mock-cancel-session";
  let finishCancellation: (() => void) | undefined;
  const cancelled = new Promise<void>((resolve) => {
    finishCancellation = resolve;
  });
  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-cancel-token", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/cancel`, async (route) => {
    finishCancellation?.();
    await route.fulfill({
      body: JSON.stringify({ ok: true, sessionId, status: "accepted" }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const at = new Date().toISOString();
    const turnId = "turn_0";
    const events = [
      { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
      { data: { sequence: 0, turnId }, meta: { at }, type: "turn.started" },
      { data: { message: "Wait", parts: [{ text: "Wait", type: "text" }], sequence: 0, turnId }, meta: { at }, type: "message.received" },
      { data: { sequence: 0, turnId }, meta: { at }, type: "turn.cancelled" },
      { data: { continuationToken: "mock-cancel-token", wait: "next-user-message" }, meta: { at }, type: "session.waiting" },
    ];
    const startIndex = Number(new URL(route.request().url()).searchParams.get("startIndex") ?? "0");
    if (startIndex === 0) {
      await route.fulfill({
        body: `${events.slice(0, 3).map((event) => JSON.stringify(event)).join("\n")}\n`,
        contentType: "application/x-ndjson",
        status: 200,
      });
      return;
    }
    await cancelled;
    await route.fulfill({
      body: `${events.slice(startIndex).map((event) => JSON.stringify(event)).join("\n")}\n`,
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Wait");
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
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at }, type: "session.started" },
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

function mockToolTurn(message: string, reply: string): string {
  const base = Date.now();
  const at = (offset: number) => new Date(base + offset).toISOString();
  const turnId = "turn_tool";
  const events = [
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at: at(0) }, type: "session.started" },
    { data: { sequence: 0, turnId }, meta: { at: at(100) }, type: "turn.started" },
    { data: { message, parts: [{ text: message, type: "text" }], sequence: 0, turnId }, meta: { at: at(200) }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId }, meta: { at: at(300) }, type: "step.started" },
    { data: { finishReason: "tool-calls", message: "Inspecting the workspace.", sequence: 0, stepIndex: 0, turnId }, meta: { at: at(500) }, type: "message.completed" },
    { data: { actions: [{ callId: "call-1", input: { command: "find . -maxdepth 2 -type f" }, kind: "tool-call", toolName: "bash" }], sequence: 0, stepIndex: 0, turnId }, meta: { at: at(600) }, type: "actions.requested" },
    { data: { result: { callId: "call-1", kind: "tool-result", output: "./index.html", toolName: "bash" }, sequence: 0, status: "completed", stepIndex: 0, turnId }, meta: { at: at(1_200) }, type: "action.result" },
    { data: { finishReason: "tool-calls", sequence: 0, stepIndex: 0, turnId, usage: { inputTokens: 10_000, outputTokens: 300 } }, meta: { at: at(1_300) }, type: "step.completed" },
    { data: { sequence: 0, stepIndex: 1, turnId }, meta: { at: at(1_400) }, type: "step.started" },
    { data: { finishReason: "stop", message: reply, sequence: 0, stepIndex: 1, turnId }, meta: { at: at(2_000) }, type: "message.completed" },
    { data: { finishReason: "stop", sequence: 0, stepIndex: 1, turnId, usage: { inputTokens: 10_600, outputTokens: 200 } }, meta: { at: at(2_100) }, type: "step.completed" },
    { data: { sequence: 0, turnId }, meta: { at: at(2_200) }, type: "turn.completed" },
    { data: { continuationToken: "mock-tool-token", wait: "next-user-message" }, meta: { at: at(2_300) }, type: "session.waiting" },
  ];
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function mockChildApprovalEvents(): readonly unknown[] {
  const base = Date.now() - 5_000;
  const at = (offset: number) => new Date(base + offset).toISOString();
  return [
    { data: { runtime: { agentId: "open-agent", agentName: "open-agent", eveVersion: "test", modelId: "mock/model" } }, meta: { at: at(0) }, type: "session.started" },
    { data: { sequence: 0, turnId: "turn-parent" }, meta: { at: at(100) }, type: "turn.started" },
    { data: { message: "Build an enterprise website", parts: [{ text: "Build an enterprise website", type: "text" }], sequence: 0, turnId: "turn-parent" }, meta: { at: at(200) }, type: "message.received" },
    { data: { sequence: 0, stepIndex: 0, turnId: "turn-parent" }, meta: { at: at(300) }, type: "step.started" },
    {
      data: {
        actions: [{
          callId: "call-agent-css",
          description: "Delegate stylesheet implementation",
          input: { message: "Build and validate the stylesheet" },
          kind: "subagent-call",
          name: "agent",
          nodeId: "agent-css",
          subagentName: "agent",
        }],
        sequence: 0,
        stepIndex: 0,
        turnId: "turn-parent",
      },
      meta: { at: at(400) },
      type: "actions.requested",
    },
    { data: { callId: "call-agent-css", childSessionId: "child-css", name: "agent", sequence: 0, sessionId: "mock-child-approval-session", toolName: "agent", turnId: "turn-parent", workflowId: "workflow-child-css" }, meta: { at: at(500) }, type: "subagent.called" },
    {
      data: {
        requests: [{
          action: { callId: "call-child-bash", input: { command: "npm test && rm -f /tmp/css-classes" }, kind: "tool-call", toolName: "bash" },
          display: "confirmation",
          options: [
            { id: "approve", label: "Approve", style: "primary" },
            { id: "deny", label: "Deny", style: "danger" },
          ],
          prompt: "Allow the delegated task to validate and clean temporary files?",
          requestId: "request-child-bash",
        }],
        sequence: 0,
        stepIndex: 1,
        turnId: "turn-child",
      },
      meta: { at: at(700) },
      type: "input.requested",
    },
    { data: { sequence: 0, turnId: "turn-parent" }, meta: { at: at(800) }, type: "turn.completed" },
    { data: { continuationToken: "mock-child-approval-token", wait: "next-user-message" }, meta: { at: at(900) }, type: "session.waiting" },
  ];
}

function mockChildApprovalResumeEvents(): string {
  const base = Date.now();
  const at = (offset: number) => new Date(base + offset).toISOString();
  const events = [
    { data: { sequence: 1, turnId: "turn-resumed" }, meta: { at: at(0) }, type: "turn.started" },
    { data: { callId: "call-agent-css", output: "Stylesheet complete", subagentName: "agent" }, meta: { at: at(100) }, type: "subagent.completed" },
    { data: { result: { callId: "call-agent-css", kind: "subagent-result", output: "Stylesheet complete", subagentName: "agent" }, sequence: 1, status: "completed", stepIndex: 0, turnId: "turn-resumed" }, meta: { at: at(200) }, type: "action.result" },
    { data: { sequence: 1, stepIndex: 0, turnId: "turn-resumed" }, meta: { at: at(300) }, type: "step.started" },
    { data: { finishReason: "stop", message: "The delegated task resumed and completed.", sequence: 1, stepIndex: 0, turnId: "turn-resumed" }, meta: { at: at(400) }, type: "message.completed" },
    { data: { finishReason: "stop", sequence: 1, stepIndex: 0, turnId: "turn-resumed", usage: { inputTokens: 20, outputTokens: 8 } }, meta: { at: at(500) }, type: "step.completed" },
    { data: { sequence: 1, turnId: "turn-resumed" }, meta: { at: at(600) }, type: "turn.completed" },
    { data: { continuationToken: "mock-resumed-token", wait: "next-user-message" }, meta: { at: at(700) }, type: "session.waiting" },
  ];
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

type FakeStoredThread = {
  readonly events?: readonly unknown[];
  readonly session?: {
    readonly continuationToken?: string;
    readonly sessionId?: string;
    readonly streamIndex?: number;
  };
  readonly [key: string]: unknown;
};

type FakeThreadCollection = {
  readonly activeThreadId?: string;
  readonly threads: readonly FakeStoredThread[];
  readonly version: number;
};

type FakeThreadStore = {
  collection: FakeThreadCollection;
  revision: number;
};

function setFakeThreadCollection(page: Page, collection: FakeThreadCollection): void {
  const store = threadStores.get(page);
  if (!store) throw new Error("The fake Agent thread store was not installed.");
  store.collection = collection;
  store.revision += 1;
}

function firstStoredThread(page: Page): FakeStoredThread | undefined {
  return threadStores.get(page)?.collection.threads[0];
}

function threadEvents(page: Page): readonly unknown[] {
  return firstStoredThread(page)?.events ?? [];
}

function isEventType(value: unknown, type: string): boolean {
  return typeof value === "object" && value !== null && "type" in value && value.type === type;
}
