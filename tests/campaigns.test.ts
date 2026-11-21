import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createProduct } from "@/server/products";
import { createCampaign, generateDayPosts, getOwnedCampaign, planCampaign, publishPost, releaseStuckPosts, updateCampaign, updatePost } from "@/server/campaigns";
import { getPublisher, publicSettings, updateSettings } from "@/server/settings";
import { runAutopilot } from "@/server/autopilot";
import { makeUser } from "./helpers";

const brief = { title: "Hardship Letter Pack", promise: "Get a lower payment before you fall behind.", audience: "People one payment behind", format: "4 letters and a call script" };
const channel = (id: string | null, identifier = "x") => ({ integrationId: id, identifier, name: identifier });

async function setup(plan: "free" | "pro" | "business" = "pro") {
  const user = await makeUser({ plan });
  const product = await createProduct(user, brief);
  const base = { productId: product.id, name: "Launch", objective: "sales" as const, monthlyBudgetCents: 0, postsPerDay: 1, channels: [channel("int_1")] };
  return { user, product, base };
}

/** Stubs the Postiz HTTP API and records calls. */
function mockPostiz(opts: { fail?: boolean } = {}) {
  const calls: { url: string; auth: string | null; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, auth: new Headers(init?.headers).get("authorization"), body: init?.body ? JSON.parse(String(init.body)) : null });
      if (u.endsWith("/integrations")) return Response.json([{ id: "int_1", name: "My X", identifier: "x", disabled: false }]);
      if (opts.fail) return new Response("boom", { status: 500 });
      return Response.json([{ postId: "pz_123", integration: "int_1" }]);
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("plan limits", () => {
  it("caps campaigns, posts per day and total budget by plan", async () => {
    const { user, base } = await setup("free"); // 1 campaign, 1 post/day, $50
    await expect(createCampaign(user, { ...base, postsPerDay: 2 })).rejects.toMatchObject({ status: 402 });
    await expect(createCampaign(user, { ...base, monthlyBudgetCents: 51_00 })).rejects.toMatchObject({ status: 402 });
    const c = await createCampaign(user, { ...base, monthlyBudgetCents: 50_00 });
    await expect(createCampaign(user, base)).rejects.toMatchObject({ status: 402 });
    await expect(updateCampaign(user, c.id, { monthlyBudgetCents: 60_00 })).rejects.toMatchObject({ status: 402 });
    expect((await updateCampaign(user, c.id, { monthlyBudgetCents: 10_00 })).monthlyBudgetCents).toBe(10_00);
  });

  it("sums budget across campaigns", async () => {
    const { user, base } = await setup("pro"); // $500 total
    await createCampaign(user, { ...base, monthlyBudgetCents: 300_00 });
    await expect(createCampaign(user, { ...base, monthlyBudgetCents: 250_00 })).rejects.toMatchObject({ status: 402 });
    await createCampaign(user, { ...base, monthlyBudgetCents: 200_00 });
  });

  it("refuses campaigns for products you do not own", async () => {
    const a = await setup();
    const b = await setup();
    await expect(createCampaign(b.user, { ...b.base, productId: a.product.id })).rejects.toMatchObject({ status: 404 });
  });
});

describe("planning and daily posts", () => {
  it("plans the budget across the campaign's channels", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, monthlyBudgetCents: 100_00, channels: [channel("int_1", "x"), channel("int_2", "linkedin")] });
    const planned = await planCampaign(user, c.id);
    expect(planned.plan!.allocations.map((a) => a.channel)).toEqual(["x", "linkedin"]);
    expect(planned.plan!.allocations.reduce((s, a) => s + a.percent, 0)).toBe(100);
  });

  it("writes exactly postsPerDay posts and is idempotent for the day", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, postsPerDay: 3, channels: [channel("int_1", "x"), channel("int_2", "linkedin")] });
    const posts = await generateDayPosts(user, c.id);
    expect(posts).toHaveLength(3);
    expect(posts.map((p) => p.channel)).toEqual(["x", "linkedin", "x"]);
    posts.forEach((p) => expect(p.content.length).toBeLessThanOrEqual(p.channel === "x" ? 280 : 3000));
    await expect(generateDayPosts(user, c.id)).rejects.toMatchObject({ status: 402 });
  });

  it("isolates campaigns and posts between users", async () => {
    const a = await setup();
    const b = await setup();
    const c = await createCampaign(a.user, a.base);
    const [post] = await generateDayPosts(a.user, c.id);
    await expect(getOwnedCampaign(b.user.id, c.id)).rejects.toMatchObject({ status: 404 });
    await expect(generateDayPosts(b.user, c.id)).rejects.toMatchObject({ status: 404 });
    await expect(updatePost(b.user.id, post.id, { content: "hijack" })).rejects.toMatchObject({ status: 404 });
    await expect(publishPost(b.user.id, post.id, { kind: "postiz", key: "key" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("publishing through Postiz", () => {
  it("stores the key encrypted and never exposes it", async () => {
    const { user } = await setup();
    mockPostiz();
    const s = await updateSettings(user, { publisher: "postiz", publisherKey: "secret-postiz-key" });
    expect(s).toEqual(expect.objectContaining({ publisher: "postiz", publisherConnected: true }));
    expect(JSON.stringify(await publicSettings(user.id))).not.toContain("secret-postiz-key");
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, user.id));
    expect(row.publisherKeyEnc).not.toContain("secret-postiz-key");
    expect(await getPublisher(user.id)).toEqual({ kind: "postiz", key: "secret-postiz-key" });
  });

  it("sends a post once, even when publish is called twice", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, base);
    const [post] = await generateDayPosts(user, c.id);
    const calls = mockPostiz();
    const [a, b] = await Promise.all([publishPost(user.id, post.id, { kind: "postiz", key: "key-1" }), publishPost(user.id, post.id, { kind: "postiz", key: "key-1" })]);
    const sent = calls.filter((x) => x.url.endsWith("/posts"));
    expect(sent).toHaveLength(1);
    expect(sent[0].auth).toBe("key-1");
    expect(sent[0].body).toMatchObject({ posts: [{ integration: { id: "int_1" }, settings: { __type: "x" } }] });
    expect([a.status, b.status]).toContain("scheduled");
    await expect(updatePost(user.id, post.id, { content: "late edit" })).rejects.toMatchObject({ status: 400 });
  });

  it("marks the post failed when Postiz errors, and allows a retry", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, base);
    const [post] = await generateDayPosts(user, c.id);
    mockPostiz({ fail: true });
    await expect(publishPost(user.id, post.id, { kind: "postiz", key: "key" })).rejects.toMatchObject({ status: 502 });
    const [failed] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(failed.status).toBe("failed");
    mockPostiz();
    expect((await publishPost(user.id, post.id, { kind: "postiz", key: "key" })).status).toBe("scheduled");
  });

  it("releases posts stuck mid-publish as failed, without resending them", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, base);
    const [post] = await generateDayPosts(user, c.id);
    const calls = mockPostiz();
    await db.update(schema.posts).set({ status: "sending", sendingAt: new Date(Date.now() - 60 * 60_000) }).where(eq(schema.posts.id, post.id));
    // A fresh attempt is left alone; a stale one is released.
    expect(await releaseStuckPosts(new Date(Date.now() - 50 * 60_000))).toBe(0);
    expect(await releaseStuckPosts()).toBe(1);
    const [row] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(row.status).toBe("failed");
    expect(row.error).toMatch(/interrupted/);
    expect(calls.filter((x) => x.url.endsWith("/posts"))).toHaveLength(0);
  });

  it("refuses to publish channels without a Postiz integration", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel(null)] });
    const [post] = await generateDayPosts(user, c.id);
    await expect(publishPost(user.id, post.id, { kind: "postiz", key: "key" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("autopilot gating", () => {
  it("is refused on the free plan and auto-approve needs Business", async () => {
    const free = await makeUser();
    await expect(updateSettings(free, { autopilot: true })).rejects.toMatchObject({ status: 402 });
    const pro = await makeUser({ plan: "pro" });
    await updateSettings(pro, { autopilot: true });
    await expect(updateSettings(pro, { autoApprove: true })).rejects.toMatchObject({ status: 402 });
  });

  it("writes for opted-in creators, publishes only approved posts, and is safe to re-run", async () => {
    const calls = mockPostiz();
    // Opted in, Pro: posts are written but wait for approval.
    const pro = await setup("pro");
    await updateSettings(pro.user, { autopilot: true, publisher: "postiz", publisherKey: "pro-key" });
    const proCamp = await createCampaign(pro.user, { ...pro.base, postsPerDay: 2 });
    await updateCampaign(pro.user, proCamp.id, { status: "active" });
    // Opted in, Business with auto-approve: written and published.
    const biz = await setup("business");
    await updateSettings(biz.user, { autopilot: true, autoApprove: true, publisher: "postiz", publisherKey: "biz-key" });
    const bizCamp = await createCampaign(biz.user, biz.base);
    await updateCampaign(biz.user, bizCamp.id, { status: "active" });
    // Not opted in, and a paused campaign: untouched.
    const quiet = await setup("pro");
    const quietCamp = await createCampaign(quiet.user, quiet.base);
    await updateCampaign(quiet.user, quietCamp.id, { status: "active" });
    // Downgraded after opting in: plan no longer includes autopilot.
    const lapsed = await setup("pro");
    await updateSettings(lapsed.user, { autopilot: true });
    const lapsedCamp = await createCampaign(lapsed.user, lapsed.base);
    await updateCampaign(lapsed.user, lapsedCamp.id, { status: "active" });
    await db.update(schema.user).set({ plan: "free" }).where(eq(schema.user.id, lapsed.user.id));

    const first = await runAutopilot();
    const count = async (campaignId: string, status?: string) =>
      (await db.select().from(schema.posts).where(eq(schema.posts.campaignId, campaignId))).filter((p) => !status || p.status === status).length;
    expect(await count(proCamp.id)).toBe(2);
    expect(await count(proCamp.id, "scheduled")).toBe(0);
    expect(await count(bizCamp.id, "scheduled")).toBe(1);
    expect(await count(quietCamp.id)).toBe(0);
    expect(await count(lapsedCamp.id)).toBe(0);
    expect(first.failed).toBe(0);
    const sentAfterFirst = calls.filter((c) => c.url.endsWith("/posts")).length;
    expect(calls.filter((c) => c.url.endsWith("/posts")).every((c) => c.auth === "biz-key")).toBe(true);

    const second = await runAutopilot();
    expect(second.written).toBe(0);
    expect(await count(proCamp.id)).toBe(2);
    expect(calls.filter((c) => c.url.endsWith("/posts")).length).toBe(sentAfterFirst);
  });
});

/** Stubs Buffer's GraphQL API and records calls. */
function mockBuffer(opts: { rejectExtras?: boolean; mutationError?: string; badKey?: boolean; rateLimited?: boolean } = {}) {
  const calls: { auth: string | null; query: string; variables: { input?: Record<string, unknown> } }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.buffer.com");
      const body = JSON.parse(String(init?.body));
      calls.push({ auth: new Headers(init?.headers).get("authorization"), query: body.query, variables: body.variables ?? {} });
      if (opts.rateLimited) return Response.json({ errors: [{ message: "Too many requests", extensions: { code: "RATE_LIMIT_EXCEEDED" } }] }, { status: 429 });
      if (opts.badKey) return Response.json({ errors: [{ message: "Not authorized", extensions: { code: "UNAUTHORIZED" } }] });
      if (body.query.includes("organizations")) return Response.json({ data: { account: { organizations: [{ id: "org_1" }] } } });
      if (body.query.includes("channels(")) {
        return Response.json({
          data: {
            channels: [
              { id: "ch_x", name: "kitforge", displayName: "Kitforge on X", service: "twitter", isLocked: false, isDisconnected: false },
              { id: "ch_li", name: "kitforge", displayName: null, service: "linkedin", isLocked: false, isDisconnected: false },
              { id: "ch_ig", name: "kitforge", displayName: "Kitforge IG", service: "instagram", isLocked: false, isDisconnected: false },
              { id: "ch_fb", name: "old", displayName: "Old page", service: "facebook", isLocked: false, isDisconnected: true },
            ],
          },
        });
      }
      if (opts.rejectExtras && "assets" in (body.variables.input ?? {})) {
        return Response.json({ errors: [{ message: 'Variable "$input" got invalid value; Field "assets" is not defined by type "CreatePostInput".' }] });
      }
      if (opts.mutationError) return Response.json({ data: { createPost: { message: opts.mutationError } } });
      return Response.json({ data: { createPost: { post: { id: "buf_post_1" } } } });
    }),
  );
  return calls;
}

describe("publishing through Buffer", () => {
  it("connects with a key and offers only channels that take text posts", async () => {
    const { user } = await setup();
    const calls = mockBuffer();
    const s = await updateSettings(user, { publisher: "buffer", publisherKey: "buffer-secret-key" });
    expect(s).toMatchObject({ publisher: "buffer", publisherConnected: true });
    expect(calls[0].auth).toBe("Bearer buffer-secret-key");
    const { listChannels } = await import("@/lib/publishers");
    const channels = await listChannels({ kind: "buffer", key: "buffer-secret-key" });
    expect(channels.filter((c) => !c.disabled).map((c) => [c.id, c.name, c.identifier])).toEqual([
      ["ch_x", "Kitforge on X", "twitter"],
      ["ch_li", "kitforge", "linkedin"],
    ]);
    // Image-only networks and disconnected channels are not offered.
    expect(channels.filter((c) => c.disabled).map((c) => c.id)).toEqual(["ch_ig", "ch_fb"]);
  });

  it("refuses a bad key without storing it", async () => {
    const { user } = await setup();
    mockBuffer({ badKey: true });
    await expect(updateSettings(user, { publisher: "buffer", publisherKey: "wrong-key-123" })).rejects.toMatchObject({ status: 400, code: "publisher_auth" });
    expect(await getPublisher(user.id)).toBeNull();
  });

  it("schedules a post at its time with the documented mutation", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel("ch_x", "twitter")] });
    const [post] = await generateDayPosts(user, c.id);
    expect(post.content.length).toBeLessThanOrEqual(280);
    await db.update(schema.posts).set({ scheduledAt: new Date(Date.now() + 3 * 3_600_000) }).where(eq(schema.posts.id, post.id));
    const calls = mockBuffer();
    const out = await publishPost(user.id, post.id, { kind: "buffer", key: "k" });
    expect(out).toMatchObject({ status: "scheduled", externalId: "buf_post_1" });
    const sent = calls.filter((x) => x.query.includes("createPost"));
    expect(sent).toHaveLength(1);
    expect(sent[0].variables.input).toMatchObject({ channelId: "ch_x", text: post.content, schedulingType: "automatic", mode: "customScheduled" });
    expect(new Date(String(sent[0].variables.input!.dueAt)).getTime()).toBeGreaterThan(Date.now());
  });

  it("shares immediately when the slot has passed", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel("ch_x", "twitter")] });
    const [post] = await generateDayPosts(user, c.id);
    await db.update(schema.posts).set({ scheduledAt: new Date(Date.now() - 3_600_000) }).where(eq(schema.posts.id, post.id));
    const calls = mockBuffer();
    await publishPost(user.id, post.id, { kind: "buffer", key: "k" });
    const input = calls.find((x) => x.query.includes("createPost"))!.variables.input!;
    expect(input.mode).toBe("shareNow");
    expect(input.dueAt).toBeUndefined();
  });

  it("falls back to the minimal input when Buffer's schema rejects optional fields", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel("ch_x", "twitter")] });
    const [post] = await generateDayPosts(user, c.id);
    const calls = mockBuffer({ rejectExtras: true });
    expect((await publishPost(user.id, post.id, { kind: "buffer", key: "k" })).status).toBe("scheduled");
    const sent = calls.filter((x) => x.query.includes("createPost"));
    expect(sent).toHaveLength(2);
    expect(sent[1].variables.input).not.toHaveProperty("assets");
  });

  it("surfaces Buffer's own refusal and rate limits, and marks the post failed", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel("ch_x", "twitter")] });
    const [post] = await generateDayPosts(user, c.id);
    mockBuffer({ mutationError: "You have reached your scheduled posts limit." });
    await expect(publishPost(user.id, post.id, { kind: "buffer", key: "k" })).rejects.toThrow(/scheduled posts limit/);
    const [failed] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(failed).toMatchObject({ status: "failed" });
    expect(failed.error).toMatch(/scheduled posts limit/);
    mockBuffer({ rateLimited: true });
    await expect(publishPost(user.id, post.id, { kind: "buffer", key: "k" })).rejects.toMatchObject({ status: 429 });
  });

  it("drops the saved key when the creator switches service", async () => {
    const { user } = await setup();
    mockBuffer();
    await updateSettings(user, { publisher: "buffer", publisherKey: "buffer-secret-key" });
    const s = await updateSettings(user, { publisher: "postiz" });
    expect(s).toMatchObject({ publisher: "postiz", publisherConnected: false });
    expect(await getPublisher(user.id)).toBeNull();
  });
});
