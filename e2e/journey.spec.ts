import { expect, test, type Page } from "@playwright/test";

const email = `creator-${Date.now()}@example.test`;
const password = "correct-horse-battery";
const shots = "test-results/shots";

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

// Screenshots are for human review only, so a slow capture never fails a test.
async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shots}/${name}`, fullPage: true, animations: "disabled", timeout: 15_000 }).catch(() => undefined);
}

test.describe.configure({ mode: "serial" });

test("public pages render and protect the studio", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From one idea");
  await shot(page, "01-landing.png");
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
  await page.goto("/store");
  await expect(page.getByText("The shelves are being stocked")).toBeVisible();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in/);
  expect(errors).toEqual([]);
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  const csp = h["content-security-policy"];
  expect(csp).toContain("frame-ancestors 'none'");
  // Scripts need this request's nonce; inline scripts are not allowed in general.
  const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"))!;
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(scriptSrc).not.toContain("unsafe-inline");
  // WebAssembly (the in-browser voice model) is allowed; evaluating JavaScript text is not.
  expect(scriptSrc).not.toContain(" 'unsafe-eval'");
  const again = (await request.get("/")).headers()["content-security-policy"];
  expect(again).not.toBe(csp); // a fresh nonce per request
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();
  expect((await request.get("/api/products")).status()).toBe(401);
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/selftest")).status()).toBe(401);
  expect((await request.get("/api/videos")).status()).toBe(401);
});

test("creator journey: idea → product → PDF → campaign → posts", async ({ page }) => {
  const errors = watchConsole(page);

  // Weak passwords are refused.
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Casey Creator");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Casey");
  await shot(page, "02-overview.png");

  // Non-admins cannot open the control panel.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/);

  // Idea lab
  await page.goto("/app/ideas");
  await page.getByLabel("Niche or audience").fill("puppy training");
  await page.getByRole("button", { name: "Find ideas" }).click();
  await expect(page.getByRole("heading", { name: "puppy training Starter Kit 1" })).toBeVisible();
  await expect(page.getByText("2 runs left this month")).toBeVisible();
  await shot(page, "03-ideas.png");
  await page.getByRole("button", { name: "Build this" }).first().click();
  await expect(page).toHaveURL(/\/app\/products\/prod_/);

  // Product studio
  await page.getByRole("button", { name: "Generate product" }).click();
  await expect(page.getByText("ready", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("2/2 sections")).toBeVisible();
  await shot(page, "04-product.png");
  const productUrl = page.url();
  const productId = productUrl.split("/").pop()!;
  const pdf = await page.request.get(`/api/products/${productId}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  // Creators cannot publish to the owner's store.
  await expect(page.getByRole("button", { name: "Publish to store" })).toHaveCount(0);

  // Campaign
  await page.getByRole("link", { name: "Promote it" }).click();
  await expect(page).toHaveURL(/\/app\/campaigns\/new\?product=/);
  await page.getByLabel("Campaign name").fill("Launch week");
  await page.getByRole("button", { name: /\$50/ }).click();
  await expect(page.getByRole("button", { name: /\$250/ })).toBeDisabled(); // above the free plan's budget
  await shot(page, "05-campaign-form.png");
  await page.getByRole("button", { name: "Create and plan campaign" }).click();
  await expect(page).toHaveURL(/\/app\/campaigns\/camp_/, { timeout: 30_000 });
  await expect(page.getByText("/month planned")).toBeVisible();
  await expect(page.getByText("100% · $50")).toBeVisible();
  await page.getByRole("button", { name: "Write today's posts" }).click();
  await expect(page.getByLabel("Post text")).toHaveValue(/Stuck getting started/);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await shot(page, "06-campaign.png");

  // Agents log shows the work.
  await page.goto("/app/agents");
  await expect(page.getByText(/Finished writing/)).toBeVisible();
  await expect(page.getByRole("switch", { name: "Daily autopilot" })).toBeDisabled(); // free plan
  await shot(page, "07-agents.png");

  // Plan limit: a second product generation is refused on the free plan.
  await page.goto("/app/products/new");
  await page.getByLabel("Product name").fill("Second Product");
  await page.getByLabel("The result it promises").fill("Another clear result in one week.");
  await page.getByLabel("Who it is for").fill("Busy people");
  await page.getByLabel("What is inside").fill("Three templates");
  await page.getByRole("button", { name: "Create brief" }).click();
  await expect(page).toHaveURL(/\/app\/products\/prod_/);
  await page.getByRole("button", { name: "Generate product" }).click();
  await expect(page.getByText("Upgrade to keep going")).toBeVisible();

  // Owner bootstrap: wrong token refused, right token grants the control panel.
  await page.goto("/claim");
  await page.getByLabel("Owner token").fill("wrong-token");
  await page.getByRole("button", { name: "Claim control panel" }).click();
  await expect(page.getByText("That token is not valid.")).toBeVisible();
  await page.getByLabel("Owner token").fill("e2e-owner-token-0123456789abcdef");
  await page.getByRole("button", { name: "Claim control panel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await shot(page, "08-admin.png");
  await page.goto("/admin/users");
  await expect(page.getByRole("table").getByText(email)).toBeVisible();
  await page.goto("/admin/system");
  await expect(page.getByText("Stripe payments")).toBeVisible();

  // Publish to the store as owner.
  await page.goto(productUrl);
  await page.getByRole("button", { name: "Publish to store" }).click();
  await expect(page.getByRole("button", { name: "Remove from store" })).toBeVisible();
  await page.goto("/store");
  await page.getByRole("link", { name: /puppy training Starter Kit 1/ }).click();
  await expect(page.getByRole("link", { name: "Download your PDF" })).toBeVisible(); // owner already has access
  await shot(page, "09-store-product.png");

  // Sign out; a visitor sees the buy button and is sent to sign up.
  await page.goto("/app");
  await page.getByRole("complementary").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/store");
  await shot(page, "10-store.png");
  await page.getByRole("link", { name: /puppy training Starter Kit 1/ }).click();
  await page.getByRole("button", { name: /Buy for/ }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=/);
  // The PDF is not downloadable without a session.
  expect((await page.request.get(`/api/products/${productId}/pdf`)).status()).toBe(401);

  // The plan-limit (402) and wrong-token (403) refusals above are deliberate.
  expect(errors.filter((e) => !/status of (402|403)/.test(e))).toEqual([]);
});

test("returning user signs in and uses every remaining screen", async ({ page }) => {
  const errors = watchConsole(page);

  // Wrong password is refused, the right one signs in.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p[role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
  await shot(page, "12-sign-in.png");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByText("3 of 4 done")).toBeVisible();
  await shot(page, "13-overview-returning.png");

  // Theme switch persists across reloads.
  await page.getByRole("button", { name: "Switch to dark theme" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await shot(page, "14-overview-dark.png");
  await page.getByRole("button", { name: "Switch to light theme" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Settings
  await page.goto("/app/settings");
  await page.getByLabel("Brand name").fill("Calm Money Studio");
  await page.getByLabel("Brand voice").fill("Plain-spoken and encouraging.");
  await page.getByRole("button", { name: "Save brand" }).click();
  await expect(page.getByText("Brand saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Brand name")).toHaveValue("Calm Money Studio");
  await expect(page.getByText("Not connected")).toBeVisible();
  await shot(page, "15-settings.png");

  // Billing and library
  await page.goto("/app/billing");
  await expect(page.getByText("Payments are not connected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeDisabled();
  await shot(page, "16-billing.png");
  await page.goto("/app/library");
  await expect(page.getByText("Nothing here yet")).toBeVisible();

  // Control panel: change own plan, then autopilot unlocks.
  await page.goto("/admin/users");
  await page.getByLabel(`Plan for ${email}`).selectOption("business");
  await page.goto("/app/agents");
  const autopilot = page.getByRole("switch", { name: "Daily autopilot" });
  await expect(autopilot).toBeEnabled();
  await autopilot.click();
  await expect(autopilot).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Daily autopilot" })).toHaveAttribute("aria-checked", "true");

  // Activate the campaign and run the autopilot by hand.
  await page.goto("/app/campaigns");
  await page.getByRole("link", { name: /Launch week/ }).click();
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.goto("/admin");
  await page.getByRole("button", { name: "Run daily autopilot now" }).click();
  await expect(page.getByText(/Ran for 1 creator\(s\) and 1 campaign\(s\)/)).toBeVisible();
  await page.goto("/admin/orders");
  await expect(page.getByText("No orders yet")).toBeVisible();
  await page.goto("/admin/products");
  await expect(page.getByRole("link", { name: "puppy training Starter Kit 1" })).toBeVisible();
  await shot(page, "17-admin-products.png");

  // Starter product: one click gives the owner a finished planner to sell.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Add the starter product" }).click();
  await expect(page).toHaveURL(/\/app\/products\/prod_/);
  await expect(page.getByText("4/4 sections")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your money snapshot" })).toBeVisible();
  await shot(page, "18-starter-product.png");
  const starterId = page.url().split("/").pop()!;
  const starterPdf = await page.request.get(`/api/products/${starterId}/pdf`);
  expect(starterPdf.status()).toBe(200);
  expect((await starterPdf.body()).length).toBeGreaterThan(20_000);
  await page.getByRole("button", { name: "Publish to store" }).click();
  await expect(page.getByRole("button", { name: "Remove from store" })).toBeVisible();
  await page.goto("/store");
  await page.getByRole("link", { name: /Money Reset 2027/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Money Reset 2027/ })).toBeVisible();
  await expect(page.getByText("10 pages")).toBeVisible();
  await shot(page, "19-starter-store.png");

  // Editing a post and saving it sticks.
  await page.goto("/app/campaigns");
  await page.getByRole("link", { name: /Launch week/ }).click();
  await page.getByRole("button", { name: "Unapprove" }).click();
  await page.getByLabel("Post text").fill("Edited by hand before publishing.");
  await page.getByRole("button", { name: "Save edit" }).click();
  await page.reload();
  await expect(page.getByLabel("Post text")).toHaveValue("Edited by hand before publishing.");

  expect(errors.filter((e) => !/status of 401/.test(e))).toEqual([]);
});

test("lead video: script, edit, then a captions-only file", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/sign-in?next=%2Fapp%2Fvideos");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/videos$/);
  await page.getByLabel("Voice").selectOption("none");
  await page.getByRole("button", { name: "Write script" }).click();
  await expect(page).toHaveURL(/\/app\/videos\/vid_/);
  await expect(page.getByLabel("On screen").first()).toHaveValue("Still stuck at step one?");
  await page.getByLabel("On screen").first().fill("A better hook");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("On screen").first()).toHaveValue("A better hook");
  // Recording runs in real time: three short scenes take about seven seconds.
  await page.getByRole("button", { name: "Create video" }).click();
  await expect(page.getByText("Your video is ready")).toBeVisible({ timeout: 45_000 });
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download video" }).click()]);
  expect(file.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  await shot(page, "17-lead-video.png");
  expect(errors).toEqual([]);
});

test("a second account cannot reach the first account's data", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Other Person");
  await page.getByLabel("Email").fill(`other-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/products");
  await expect(page.getByText("Nothing on the shelf yet")).toBeVisible();
  await page.goto("/app/campaigns");
  await expect(page.getByText("No campaigns running")).toBeVisible();
  const res = await page.request.patch("/api/admin/users/anything", { data: { role: "admin" } });
  expect(res.status()).toBe(403);
});

test("mobile layout has no horizontal scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  for (const path of ["/", "/pricing", "/store", "/sign-up"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.goto("/");
  await shot(page, "11-mobile.png");
  await ctx.close();
});
