import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { limitFor, planBudget, writePosts, type CampaignBrief } from "@/lib/ai";
import { getPlan } from "@/lib/plans";
import { badRequest, limitReached, msg, notFound, tr } from "@/lib/errors";
import { appUrl } from "@/lib/env";
import { schedulePost, type PublisherAuth } from "@/lib/publishers";
import { money } from "@/lib/format";
import { newId } from "@/lib/utils";
import { getOwnedProduct } from "./products";
import { getPublisher, getSettings } from "./settings";
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
    throw limitReached(
      plan.limits.campaigns === 1
        ? msg("The {plan} plan includes {count} campaign. Upgrade to add more.")
        : msg("The {plan} plan includes {count} campaigns. Upgrade to add more."),
      { plan: tr(plan.name), count: plan.limits.campaigns },
    );
  }
  if (next.postsPerDay > plan.limits.postsPerDay) {
    throw limitReached(
      plan.limits.postsPerDay === 1
        ? msg("The {plan} plan allows up to {count} post a day per campaign.")
        : msg("The {plan} plan allows up to {count} posts a day per campaign."),
      { plan: tr(plan.name), count: plan.limits.postsPerDay },
    );
  }
  const total = others.reduce((s, c) => s + c.budget, 0) + next.monthlyBudgetCents;
  if (total > plan.limits.monthlyAdBudgetCents) {
    throw limitReached(msg("That brings your planned ad budget to {total} a month. The {plan} plan covers up to {limit}."), {
      total: money(total),
      plan: tr(plan.name),
      limit: money(plan.limits.monthlyAdBudgetCents),
    });
  }
}

export async function createCampaign(user: Actor, input: CampaignInput): Promise<Campaign> {
  if (!input.channels.length) throw badRequest(msg("Pick at least one channel."));
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
      language: p.language,
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
  if (missing <= 0) throw limitReached(perDay === 1 ? msg("Today's {count} post is already written for this campaign.") : msg("Today's {count} posts are already written for this campaign."), { count: perDay });

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
  if (!rows.length) throw badRequest(msg("No posts were written. Try again."));
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
  if (p.status === "scheduled") throw badRequest(msg("This post was already sent to your publishing service. Edit it there."));
  const set: Partial<typeof schema.posts.$inferInsert> = {};
  if (patch.content !== undefined) {
    if (patch.content.length > limitFor(p.channel)) throw badRequest(msg("Posts on {channel} can be at most {limit} characters."), { channel: p.channel, limit: limitFor(p.channel) });
    set.content = patch.content;
  }
  if (patch.approved !== undefined) set.status = patch.approved ? "approved" : "draft";
  if (!Object.keys(set).length) return p;
  const [row] = await db.update(schema.posts).set({ ...set, error: null }).where(eq(schema.posts.id, p.id)).returning();
  return row;
}

/**
 * A publish attempt that never finished (the function was killed mid-call)
 * leaves a post in "sending". We cannot know whether the publishing service received it, so it
 * is marked failed with a note rather than resent automatically.
 */
export async function releaseStuckPosts(now = new Date()): Promise<number> {
  const rows = await db
    .update(schema.posts)
    .set({ status: "failed", error: "Publishing was interrupted. Check your publishing service before publishing again to avoid a duplicate." })
    .where(and(eq(schema.posts.status, "sending"), lt(schema.posts.sendingAt, new Date(now.getTime() - 15 * 60_000))))
    .returning({ id: schema.posts.id });
  return rows.length;
}

export async function deletePost(userId: string, id: string) {
  await db.delete(schema.posts).where(and(eq(schema.posts.id, id), eq(schema.posts.userId, userId)));
}

/**
 * Publisher agent: hands one post to the connected service (Buffer or Postiz). The row is claimed first with a
 * conditional update so a retry or a parallel cron run cannot double-post.
 */
export async function publishPost(userId: string, id: string, given?: PublisherAuth | null): Promise<Post> {
  const p = await getOwnedPost(userId, id);
  if (p.status === "scheduled") return p;
  if (!p.integrationId) throw badRequest(msg("This channel is not connected to a publishing service. Copy the post, or connect Buffer in Settings and create a new campaign."));
  const auth = given ?? (await getPublisher(userId));
  if (!auth) throw badRequest(msg("Connect Buffer in Settings to publish."));
  const claimed = await db
    .update(schema.posts)
    .set({ status: "sending", error: null, sendingAt: new Date() })
    .where(and(eq(schema.posts.id, p.id), sql`${schema.posts.status} in ('draft','approved','failed')`))
    .returning({ id: schema.posts.id });
  if (!claimed.length) return getOwnedPost(userId, id);
  try {
    const when = p.scheduledAt.getTime() < Date.now() ? new Date() : p.scheduledAt;
    const res = await schedulePost(auth, { integrationId: p.integrationId, identifier: p.channel, content: p.content, date: when });
    const [row] = await db.update(schema.posts).set({ status: "scheduled", externalId: res.id }).where(eq(schema.posts.id, p.id)).returning();
    return row;
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "Publishing failed.";
    await db.update(schema.posts).set({ status: "failed", error: message }).where(eq(schema.posts.id, p.id));
    throw e;
  }
}
