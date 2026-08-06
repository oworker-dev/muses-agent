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
  await expect(composer).toBeEnabled();
  const activity = page.getByRole("status").filter({ hasText: "Starting task" });
  await expect(activity).toBeVisible();
  await expect(activity).toHaveText("Starting task");
  await page.waitForTimeout(8_500);
  await expect(page.getByText("Reconnecting to the active run...")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeVisible();
  await expect(page.getByText("Slow task completed.", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeEnabled();
});

test("follow-up messages queue during a run and deliver in order at the waiting boundary", async ({ page }) => {
  const sessionId = "mock-follow-up-session";
  let continuationRequests = 0;
  let mailboxBody: Record<string, unknown> | undefined;
  let mailboxRequests = 0;

  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-follow-up-token-0", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    continuationRequests += 1;
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-follow-up-token-1", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route("**/api/standalone/mailbox", async (route) => {
    mailboxRequests += 1;
    mailboxBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: mailboxBody.clientMessageId,
          itemId: "mail-follow-up",
          status: "queued",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 202,
    });
  });
  await page.route("**/api/standalone/mailbox/mail-follow-up", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: mailboxBody?.clientMessageId ?? "unknown-client-message",
          itemId: "mail-follow-up",
          status: "accepted",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const startIndex = Number(new URL(route.request().url()).searchParams.get("startIndex") ?? "0");
    if (startIndex === 0) {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      await route.fulfill({
        body: mockSuccessfulTurn("Start the long task", "First turn completed."),
        contentType: "application/x-ndjson",
        status: 200,
      });
      return;
    }
    const body = mockContinuationTurn("Add the requested footer", "Footer added.");
    const eventCount = eventsFromNdjson(body).length;
    await route.fulfill({
      body,
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(startIndex + eventCount - 1) },
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Start the long task");
  await composer.press("Enter");
  await expect(composer).toBeEnabled();
  await expect(page.getByRole("button", { name: "Queue follow-up" })).toBeVisible();
  await composer.fill("Add the requested footer");
  await composer.press("Enter");

  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeVisible();
  await expect(page.getByText("Add the requested footer", { exact: true })).toBeVisible();
  await expect(page.getByText("Footer added.", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeHidden();
  expect(continuationRequests).toBe(0);
  expect(mailboxRequests).toBe(1);
  expect(mailboxBody).toMatchObject({
    message: "Add the requested footer",
    sessionId,
  });
});

test("cancelling a queued follow-up prevents browser delivery before admission", async ({ page }) => {
  const sessionId = "mock-cancel-follow-up-session";
  let cancellationRequests = 0;
  let continuationRequests = 0;
  let mailboxEnqueues = 0;
  let mailboxInspections = 0;

  await page.route("**/eve/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-cancel-token-0", sessionId }),
      contentType: "application/json",
      headers: { "x-eve-session-id": sessionId },
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    continuationRequests += 1;
    await route.fulfill({ status: 500 });
  });
  await page.route("**/api/standalone/mailbox", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: body.clientMessageId,
          itemId: "mail-cancel-follow-up",
          status: "queued",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 202,
    });
    mailboxEnqueues += 1;
  });
  await page.route("**/api/standalone/mailbox/mail-cancel-follow-up", async (route) => {
    const cancelled = route.request().method() === "DELETE";
    if (cancelled) cancellationRequests += 1;
    else mailboxInspections += 1;
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: "queued-cancel-follow-up",
          itemId: "mail-cancel-follow-up",
          status: cancelled ? "cancelled" : "queued",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.fulfill({
      body: mockSuccessfulTurn("Start cancellable work", "Cancellable work completed."),
      contentType: "application/x-ndjson",
      status: 200,
    });
  });

  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "Describe a task" });
  await composer.fill("Start cancellable work");
  await composer.press("Enter");
  await expect(page.getByRole("button", { name: "Queue follow-up" })).toBeVisible();
  await composer.fill("Do not deliver this follow-up");
  await composer.press("Enter");
  await expect(page.getByText("Do not deliver this follow-up", { exact: true })).toBeVisible();
  await expect.poll(() => mailboxEnqueues).toBe(1);
  await expect.poll(() => mailboxInspections).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Remove queued message" }).click();
  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeHidden();
  await expect(page.getByText("Cancellable work completed.", { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(cancellationRequests).toBe(1);
  expect(continuationRequests).toBe(0);
});

test("a persisted follow-up survives recovery and dispatches after the durable boundary", async ({ page }) => {
  const sessionId = "mock-persisted-follow-up-session";
  const initialTurn = eventsFromNdjson(mockSuccessfulTurn("Start persisted work", "Persisted work completed."));
  const acceptedEvents = initialTurn.slice(0, 4);
  let continuationRequests = 0;
  let mailboxEnqueues = 0;

  setFakeThreadCollection(page, {
    activeThreadId: "persisted-follow-up-thread",
    threads: [{
      createdAt: Date.now(),
      events: acceptedEvents,
      id: "persisted-follow-up-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      queuedTurns: [{
        delivery: "server",
        id: "queued-persisted-footer",
        mailboxItemId: "mail-persisted-footer",
        state: "queued",
        submittedAt: Date.now(),
        text: "Add the persisted footer",
      }],
      session: { sessionId, streamIndex: acceptedEvents.length },
      status: "streaming",
      title: "Persisted follow-up",
      updatedAt: Date.now(),
    }],
    version: 2,
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    continuationRequests += 1;
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-persisted-token-2", sessionId }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/standalone/mailbox", async (route) => {
    mailboxEnqueues += 1;
    await route.fulfill({ status: 500 });
  });
  await page.route("**/api/standalone/mailbox/mail-persisted-footer", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: "queued-persisted-footer",
          itemId: "mail-persisted-footer",
          status: "accepted",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const url = new URL(route.request().url());
    const startIndex = Number(url.searchParams.get("startIndex") ?? "0");
    if (startIndex < initialTurn.length) {
      await route.fulfill({
        body: `${initialTurn.slice(startIndex).map((event) => JSON.stringify(event)).join("\n")}\n`,
        contentType: "application/x-ndjson",
        headers: { "x-eve-stream-tail-index": String(initialTurn.length - 1) },
        status: 200,
      });
      return;
    }
    const body = mockContinuationTurn("Add the persisted footer", "Persisted footer added.");
    const eventCount = eventsFromNdjson(body).length;
    await route.fulfill({
      body,
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(startIndex + eventCount - 1) },
      status: 200,
    });
  });

  await page.goto("/threads/persisted-follow-up-thread");
  await expect(page.getByText("Persisted footer added.", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeHidden();
  expect(continuationRequests).toBe(0);
  expect(mailboxEnqueues).toBe(0);
});

test("two persisted follow-ups remain separate and recover in strict FIFO order", async ({ page }) => {
  const sessionId = "mock-fifo-follow-up-session";
  const initialEvents = eventsFromNdjson(mockSuccessfulTurn("Prepare the workspace", "Workspace prepared."));
  const firstEvents = eventsFromNdjson(mockContinuationTurn("Add the header", "Header added.", 1));
  const secondEvents = eventsFromNdjson(mockContinuationTurn("Add the footer", "Footer added.", 2));
  const firstCursor = initialEvents.length;
  const secondCursor = firstCursor + firstEvents.length;
  let continuationRequests = 0;
  const mailboxInspections: string[] = [];

  setFakeThreadCollection(page, {
    activeThreadId: "fifo-follow-up-thread",
    threads: [{
      createdAt: Date.now(),
      events: initialEvents,
      id: "fifo-follow-up-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      queuedTurns: [
        {
          delivery: "server",
          id: "queued-fifo-header",
          mailboxItemId: "mail-fifo-header",
          state: "queued",
          submittedAt: Date.now(),
          text: "Add the header",
        },
        {
          delivery: "server",
          id: "queued-fifo-footer",
          mailboxItemId: "mail-fifo-footer",
          state: "queued",
          submittedAt: Date.now() + 1,
          text: "Add the footer",
        },
      ],
      session: {
        continuationToken: "mock-token-1",
        sessionId,
        streamIndex: firstCursor,
      },
      status: "ready",
      title: "FIFO follow-ups",
      updatedAt: Date.now(),
    }],
    version: 2,
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    continuationRequests += 1;
    await route.fulfill({ status: 500 });
  });
  for (const [itemId, clientMessageId] of [
    ["mail-fifo-header", "queued-fifo-header"],
    ["mail-fifo-footer", "queued-fifo-footer"],
  ] as const) {
    await page.route(`**/api/standalone/mailbox/${itemId}`, async (route) => {
      mailboxInspections.push(itemId);
      await route.fulfill({
        body: JSON.stringify({
          item: { clientMessageId, itemId, status: "committed" },
          ok: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });
  }
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const startIndex = Number(new URL(route.request().url()).searchParams.get("startIndex") ?? "0");
    const body = startIndex < secondCursor
      ? `${firstEvents.slice(Math.max(0, startIndex - firstCursor)).map((event) => JSON.stringify(event)).join("\n")}\n`
      : `${secondEvents.slice(Math.max(0, startIndex - secondCursor)).map((event) => JSON.stringify(event)).join("\n")}\n`;
    const eventCount = eventsFromNdjson(body).length;
    await route.fulfill({
      body,
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(startIndex + eventCount - 1) },
      status: 200,
    });
  });

  await page.goto("/threads/fifo-follow-up-thread");
  await expect(page.getByText("Header added.", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Footer added.", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeHidden();

  const storedMessages = threadEvents(page)
    .filter((event) => isEventType(event, "message.received"))
    .map((event) => (event as { data: { message: string } }).data.message);
  expect(storedMessages).toEqual(["Prepare the workspace", "Add the header", "Add the footer"]);
  expect(continuationRequests).toBe(0);
  expect(mailboxInspections).toContain("mail-fifo-header");
  expect(mailboxInspections).toContain("mail-fifo-footer");
});

test("a failed queued follow-up remains retryable without duplicating the accepted turn", async ({ page }) => {
  const sessionId = "mock-retry-follow-up-session";
  const settledEvents = eventsFromNdjson(mockSuccessfulTurn("Prepare retry", "Ready for follow-up."));
  let continuationRequests = 0;

  setFakeThreadCollection(page, {
    activeThreadId: "retry-follow-up-thread",
    threads: [{
      createdAt: Date.now(),
      events: settledEvents,
      id: "retry-follow-up-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      queuedTurns: [{
        delivery: "server",
        id: "queued-retry-footer",
        mailboxItemId: "mail-retry-footer",
        state: "delivery-failed",
        submittedAt: Date.now(),
        text: "Retry the footer",
      }],
      session: {
        continuationToken: "mock-token-1",
        sessionId,
        streamIndex: settledEvents.length,
      },
      status: "ready",
      title: "Retry follow-up",
      updatedAt: Date.now(),
    }],
    version: 2,
  });
  await page.route(`**/eve/v1/session/${sessionId}`, async (route) => {
    continuationRequests += 1;
    if (continuationRequests === 1) {
      await route.abort("connectionfailed");
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ continuationToken: "mock-retry-token-2", sessionId }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/standalone/mailbox/mail-retry-footer", async (route) => {
    if (route.request().method() !== "GET") continuationRequests += 1;
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: "queued-retry-footer",
          itemId: "mail-retry-footer",
          status: route.request().method() === "PATCH" ? "queued" : "accepted",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/eve/v1/session/${sessionId}/stream**`, async (route) => {
    const startIndex = Number(new URL(route.request().url()).searchParams.get("startIndex") ?? "0");
    const body = mockContinuationTurn("Retry the footer", "Retried footer added.");
    const eventCount = eventsFromNdjson(body).length;
    await route.fulfill({
      body,
      contentType: "application/x-ndjson",
      headers: { "x-eve-stream-tail-index": String(startIndex + eventCount - 1) },
      status: 200,
    });
  });

  await page.goto("/threads/retry-follow-up-thread");
  await expect(page.getByText("Delivery failed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry queued message" }).click();
  await expect(page.getByText("Retried footer added.", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Queued follow-ups/u })).toBeHidden();
  expect(continuationRequests).toBe(1);
});

test("an ambiguous mailbox admission is visible but never offered as a blind retry", async ({ page }) => {
  const sessionId = "mock-ambiguous-follow-up-session";
  const settledEvents = eventsFromNdjson(mockSuccessfulTurn("Prepare ambiguity", "Ready for follow-up."));

  setFakeThreadCollection(page, {
    activeThreadId: "ambiguous-follow-up-thread",
    threads: [{
      createdAt: Date.now(),
      events: settledEvents,
      id: "ambiguous-follow-up-thread",
      preferences: { executionMode: "standard", modelId: "gpt-5.6-sol", reasoning: "medium" },
      queuedTurns: [{
        delivery: "server",
        id: "queued-ambiguous-footer",
        mailboxItemId: "mail-ambiguous-footer",
        state: "admission-ambiguous",
        submittedAt: Date.now(),
        text: "The possibly admitted footer",
      }],
      session: { continuationToken: "mock-ambiguous-token", sessionId, streamIndex: settledEvents.length },
      status: "ready",
      title: "Ambiguous follow-up",
      updatedAt: Date.now(),
    }],
    version: 2,
  });
  await page.route("**/api/standalone/mailbox/mail-ambiguous-footer", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        item: {
          clientMessageId: "queued-ambiguous-footer",
          itemId: "mail-ambiguous-footer",
          lastError: "The admission response was lost.",
          status: "submission-ambiguous",
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/threads/ambiguous-follow-up-thread");
  await expect(page.getByText("Admission needs review", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry queued message" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove queued message" })).toHaveCount(0);
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
  await page.route("**/eve/v1/session/child-css/stream**", async (route) => {
    await route.fulfill({
      body: mockCompletedChildTurn("Build and validate the stylesheet", "Child stylesheet complete."),
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
  await page.getByRole("button", { name: "Sub-agent", exact: true }).click();
  await expect(page.getByText("Sub-agent finished and returned its result to the parent Agent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open sub-agents" }).click();
  await expect(page.getByRole("region", { name: "Done" }).getByText("Sub-agent 1", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Open sub-agent session/u }).click();
  await expect(page).toHaveURL(/\/threads\/child-approval-thread\/agents\/child-css$/);
  await expect(page.getByText("Child stylesheet complete.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to parent task" }).click();
  await expect(page).toHaveURL(/\/threads\/child-approval-thread$/);
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
  await expect(page.getByRole("textbox", { name: "Describe a task" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Queue follow-up" })).toBeVisible();
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

function mockCompletedChildTurn(message: string, reply: string): string {
  const events = eventsFromNdjson(mockSuccessfulTurn(message, reply));
  const at = new Date().toISOString();
  return `${[
    ...events.slice(0, -1),
    { data: { result: reply }, meta: { at }, type: "session.completed" },
  ].map((event) => JSON.stringify(event)).join("\n")}\n`;
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

function mockContinuationTurn(message: string, reply: string, sequence = 1): string {
  const at = new Date().toISOString();
  const turnId = `turn_${sequence}`;
  const events = [
    { data: { sequence, turnId }, meta: { at }, type: "turn.started" },
    { data: { message, parts: [{ text: message, type: "text" }], sequence, turnId }, meta: { at }, type: "message.received" },
    { data: { sequence, stepIndex: 0, turnId }, meta: { at }, type: "step.started" },
    { data: { finishReason: "stop", message: reply, sequence, stepIndex: 0, turnId }, meta: { at }, type: "message.completed" },
    { data: { finishReason: "stop", sequence, stepIndex: 0, turnId, usage: { inputTokens: 2, outputTokens: 2 } }, meta: { at }, type: "step.completed" },
    { data: { sequence, turnId }, meta: { at }, type: "turn.completed" },
    { data: { continuationToken: `mock-follow-up-token-${sequence}`, wait: "next-user-message" }, meta: { at }, type: "session.waiting" },
  ];
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function eventsFromNdjson(payload: string): readonly unknown[] {
  return payload.trim().split("\n").map((line) => JSON.parse(line) as unknown);
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
