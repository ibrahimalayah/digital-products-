import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createProduct } from "@/server/products";
import { createCampaign, generateDayPosts, getOwnedCampaign, planCampaign, publishPost, updateCampaign, updatePost } from "@/server/campaigns";
import { getPostizKey, publicSettings, updateSettings } from "@/server/settings";
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
    await expect(publishPost(b.user.id, post.id, "key")).rejects.toMatchObject({ status: 404 });
  });
});

describe("publishing through Postiz", () => {
  it("stores the key encrypted and never exposes it", async () => {
    const { user } = await setup();
    mockPostiz();
    const s = await updateSettings(user, { postizKey: "secret-postiz-key" });
    expect(s).toEqual(expect.objectContaining({ postizConnected: true }));
    expect(JSON.stringify(await publicSettings(user.id))).not.toContain("secret-postiz-key");
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.userId, user.id));
    expect(row.postizKeyEnc).not.toContain("secret-postiz-key");
    expect(await getPostizKey(user.id)).toBe("secret-postiz-key");
  });

  it("sends a post once, even when publish is called twice", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, base);
    const [post] = await generateDayPosts(user, c.id);
    const calls = mockPostiz();
    const [a, b] = await Promise.all([publishPost(user.id, post.id, "key-1"), publishPost(user.id, post.id, "key-1")]);
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
    await expect(publishPost(user.id, post.id, "key")).rejects.toMatchObject({ status: 502 });
    const [failed] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(failed.status).toBe("failed");
    mockPostiz();
    expect((await publishPost(user.id, post.id, "key")).status).toBe("scheduled");
  });

  it("refuses to publish channels without a Postiz integration", async () => {
    const { user, base } = await setup();
    const c = await createCampaign(user, { ...base, channels: [channel(null)] });
    const [post] = await generateDayPosts(user, c.id);
    await expect(publishPost(user.id, post.id, "key")).rejects.toMatchObject({ status: 400 });
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
    await updateSettings(pro.user, { autopilot: true, postizKey: "pro-key" });
    const proCamp = await createCampaign(pro.user, { ...pro.base, postsPerDay: 2 });
    await updateCampaign(pro.user, proCamp.id, { status: "active" });
    // Opted in, Business with auto-approve: written and published.
    const biz = await setup("business");
    await updateSettings(biz.user, { autopilot: true, autoApprove: true, postizKey: "biz-key" });
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
