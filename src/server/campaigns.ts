import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { limitFor, planBudget, writePosts, type CampaignBrief } from "@/lib/ai";
import { getPlan } from "@/lib/plans";
import { badRequest, limitReached, notFound } from "@/lib/errors";
import { appUrl } from "@/lib/env";
import { schedulePost } from "@/lib/postiz";
import { money } from "@/lib/format";
import { newId } from "@/lib/utils";
import { getOwnedProduct } from "./products";
import { getPostizKey, getSettings } from "./settings";
import { logRun } from "./agents-log";
import type { CurrentUser } from "@/lib/session";
import type { CampaignChannel } from "@/lib/types";

export type Campaign = typeof schema.campaigns.$inferSelect;
export type Post = typeof schema.posts.$inferSelect;
type Actor = Pick<CurrentUser, "id" | "plan" | "role">;

export const GENERIC_CHANNELS = ["x", "linkedin", "instagram", "facebook", "tiktok", "pinterest", "threads"];

export type CampaignInput = {
  productId: string;
  name: string;
  objective: "sales" | "awareness" | "leads";
  monthlyBudgetCents: number;
  postsPerDay: number;
  channels: CampaignChannel[];
};

/** Plan gates: number of live campaigns, posts per day, and total planned budget. */
async function assertWithinPlan(user: Actor, next: { monthlyBudgetCents: number; postsPerDay: number }, excludeId?: string) {
  const plan = getPlan(user.plan);
  const others = await db
    .select({ id: schema.campaigns.id, budget: schema.campaigns.monthlyBudgetCents })
    .from(schema.campaigns)
    .where(and(eq(schema.campaigns.userId, user.id), excludeId ? ne(schema.campaigns.id, excludeId) : undefined));
  if (!excludeId && others.length >= plan.limits.campaigns) {
    throw limitReached(`The ${plan.name} plan includes ${plan.limits.campaigns} campaign${plan.limits.campaigns === 1 ? "" : "s"}. Upgrade to add more.`);
  }
  if (next.postsPerDay > plan.limits.postsPerDay) {
    throw limitReached(`The ${plan.name} plan allows up to ${plan.limits.postsPerDay} post${plan.limits.postsPerDay === 1 ? "" : "s"} a day per campaign.`);
  }
  const total = others.reduce((s, c) => s + c.budget, 0) + next.monthlyBudgetCents;
  if (total > plan.limits.monthlyAdBudgetCents) {
    throw limitReached(
      `That brings your planned ad budget to ${money(total)} a month. The ${plan.name} plan covers up to ${money(plan.limits.monthlyAdBudgetCents)}.`,
    );
  }
}

export async function createCampaign(user: Actor, input: CampaignInput): Promise<Campaign> {
  if (!input.channels.length) throw badRequest("Pick at least one channel.");
  await getOwnedProduct(user.id, input.productId);
  await assertWithinPlan(user, input);
  const [row] = await db
    .insert(schema.campaigns)
    .values({ id: newId("camp"), userId: user.id, ...input })
    .returning();
  return row;
}

export async function getOwnedCampaign(userId: string, id: string): Promise<Campaign> {
  const [row] = await db.select().from(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId))).limit(1);
  if (!row) throw notFound("Campaign");
  return row;
}

export function listCampaigns(userId: string) {
  return db
    .select({ campaign: schema.campaigns, productTitle: schema.products.title })
    .from(schema.campaigns)
    .innerJoin(schema.products, eq(schema.campaigns.productId, schema.products.id))
    .where(eq(schema.campaigns.userId, userId))
    .orderBy(desc(schema.campaigns.createdAt));
}

export async function updateCampaign(
  user: Actor,
  id: string,
  patch: Partial<Pick<Campaign, "name" | "monthlyBudgetCents" | "postsPerDay" | "status">>,
): Promise<Campaign> {
  const c = await getOwnedCampaign(user.id, id);
  if (patch.monthlyBudgetCents !== undefined || patch.postsPerDay !== undefined) {
    await assertWithinPlan(
      user,
      { monthlyBudgetCents: patch.monthlyBudgetCents ?? c.monthlyBudgetCents, postsPerDay: patch.postsPerDay ?? c.postsPerDay },
      c.id,
    );
  }
  const set = { ...patch };
  // A changed budget invalidates the old allocation.
  const [row] = await db
    .update(schema.campaigns)
    .set(patch.monthlyBudgetCents !== undefined && patch.monthlyBudgetCents !== c.monthlyBudgetCents ? { ...set, plan: null } : set)
    .where(eq(schema.campaigns.id, c.id))
    .returning();
  return row;
}

export async function deleteCampaign(userId: string, id: string) {
  await db.delete(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)));
}

async function briefFor(userId: string, c: Campaign): Promise<CampaignBrief> {
  const p = await getOwnedProduct(userId, c.productId);
  const s = await getSettings(userId);
  return {
    product: {
      title: p.title,
      promise: p.promise,
      audience: p.audience,
      format: p.format,
      tone: p.tone,
      priceUsd: p.priceCents / 100,
      url: p.status === "published" ? `${appUrl()}/store/${p.slug}` : appUrl(),
    },
    objective: c.objective,
    monthlyBudgetUsd: c.monthlyBudgetCents / 100,
    postsPerDay: c.postsPerDay,
    channels: [...new Set(c.channels.map((ch) => ch.identifier))],
    brandVoice: s.brandVoice,
  };
}

/** Ad-planner agent: splits the budget across channels and sets angles. */
export async function planCampaign(user: Actor, id: string): Promise<Campaign> {
  const c = await getOwnedCampaign(user.id, id);
  try {
    const plan = await planBudget(await briefFor(user.id, c));
    const [row] = await db.update(schema.campaigns).set({ plan }).where(eq(schema.campaigns.id, c.id)).returning();
    await logRun(user.id, "ad-planner", "ok", `Planned ${money(c.monthlyBudgetCents)}/mo across ${plan.allocations.length} channels for "${c.name.slice(0, 60)}".`);
    return row;
  } catch (e) {
    await logRun(user.id, "ad-planner", "error", `Planning failed for "${c.name.slice(0, 60)}".`);
    throw e;
  }
}

const dayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Spreads n posts between 09:00 and 19:00 UTC, never in the past. */
export function slotTimes(day: Date, n: number, now = new Date()): Date[] {
  const start = dayStart(day).getTime() + 9 * 3_600_000;
  const span = 10 * 3_600_000;
  return Array.from({ length: n }, (_, i) => {
    const t = start + (n === 1 ? span / 3 : (span * i) / (n - 1));
    return new Date(Math.max(t, now.getTime() + 10 * 60_000 + i * 5 * 60_000));
  });
}

/**
 * Daily-poster agent: writes a day's posts for a campaign, up to its
 * posts-per-day setting. Idempotent per day: it only fills what is missing.
 */
export async function generateDayPosts(user: Actor, id: string, day = new Date()): Promise<Post[]> {
  const c = await getOwnedCampaign(user.id, id);
  const plan = getPlan(user.plan);
  const perDay = Math.min(c.postsPerDay, plan.limits.postsPerDay);
  const from = dayStart(day);
  const to = new Date(from.getTime() + 86_400_000);
  const existing = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(eq(schema.posts.campaignId, c.id), gte(schema.posts.scheduledAt, from), lt(schema.posts.scheduledAt, to)));
  const missing = perDay - existing.length;
  if (missing <= 0) throw limitReached(`Today's ${perDay} post${perDay === 1 ? " is" : "s are"} already written for this campaign.`);

  // Rotate through the campaign's channels, continuing where earlier posts stopped.
  const slots = Array.from({ length: missing }, (_, i) => c.channels[(existing.length + i) % c.channels.length]);
  const recent = await db
    .select({ content: schema.posts.content })
    .from(schema.posts)
    .where(eq(schema.posts.campaignId, c.id))
    .orderBy(desc(schema.posts.createdAt))
    .limit(6);
  const drafts = await writePosts(
    await briefFor(user.id, c),
    slots.map((s) => s.identifier),
    c.plan?.angles ?? [],
    recent.map((r) => r.content.slice(0, 280)),
  );
  const times = slotTimes(day, perDay).slice(existing.length);
  const rows = drafts
    .filter((d) => d.content.length > 0)
    .map((d, i) => ({
      id: newId("post"),
      userId: user.id,
      campaignId: c.id,
      channel: d.channel,
      integrationId: slots[i].integrationId,
      angle: d.angle,
      content: d.content,
      scheduledAt: times[i] ?? times[times.length - 1],
    }));
  if (!rows.length) throw badRequest("No posts were written. Try again.");
  const inserted = await db.insert(schema.posts).values(rows).returning();
  await logRun(user.id, "daily-poster", "ok", `Wrote ${inserted.length} post${inserted.length === 1 ? "" : "s"} for "${c.name.slice(0, 60)}".`);
  return inserted;
}

export function listPosts(userId: string, campaignId: string) {
  return db
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.campaignId, campaignId), eq(schema.posts.userId, userId)))
    .orderBy(desc(schema.posts.scheduledAt))
    .limit(200);
}

async function getOwnedPost(userId: string, id: string): Promise<Post> {
  const [row] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, id), eq(schema.posts.userId, userId))).limit(1);
  if (!row) throw notFound("Post");
  return row;
}

export async function updatePost(userId: string, id: string, patch: { content?: string; approved?: boolean }): Promise<Post> {
  const p = await getOwnedPost(userId, id);
  if (p.status === "scheduled") throw badRequest("This post was already sent to Postiz. Edit it there.");
  const set: Partial<typeof schema.posts.$inferInsert> = {};
  if (patch.content !== undefined) {
    if (patch.content.length > limitFor(p.channel)) throw badRequest(`Posts on ${p.channel} can be at most ${limitFor(p.channel)} characters.`);
    set.content = patch.content;
  }
  if (patch.approved !== undefined) set.status = patch.approved ? "approved" : "draft";
  if (!Object.keys(set).length) return p;
  const [row] = await db.update(schema.posts).set({ ...set, error: null }).where(eq(schema.posts.id, p.id)).returning();
  return row;
}

export async function deletePost(userId: string, id: string) {
  await db.delete(schema.posts).where(and(eq(schema.posts.id, id), eq(schema.posts.userId, userId)));
}

/**
 * Publisher agent: hands one post to Postiz. The row is claimed first with a
 * conditional update so a retry or a parallel cron run cannot double-post.
 */
export async function publishPost(userId: string, id: string, apiKey?: string | null): Promise<Post> {
  const p = await getOwnedPost(userId, id);
  if (p.status === "scheduled") return p;
  if (!p.integrationId) throw badRequest("This channel is not connected through Postiz. Copy the post, or connect Postiz in Settings and recreate the campaign.");
  const key = apiKey ?? (await getPostizKey(userId));
  if (!key) throw badRequest("Connect your Postiz API key in Settings to publish.");
  const claimed = await db
    .update(schema.posts)
    .set({ status: "sending", error: null })
    .where(and(eq(schema.posts.id, p.id), sql`${schema.posts.status} in ('draft','approved','failed')`))
    .returning({ id: schema.posts.id });
  if (!claimed.length) return getOwnedPost(userId, id);
  try {
    const when = p.scheduledAt.getTime() < Date.now() ? new Date() : p.scheduledAt;
    const res = await schedulePost(key, { integrationId: p.integrationId, identifier: p.channel, content: p.content, date: when });
    const [row] = await db.update(schema.posts).set({ status: "scheduled", externalId: res.id }).where(eq(schema.posts.id, p.id)).returning();
    return row;
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "Publishing failed.";
    await db.update(schema.posts).set({ status: "failed", error: message }).where(eq(schema.posts.id, p.id));
    throw e;
  }
}
