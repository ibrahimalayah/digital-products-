import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getPlan } from "./plans";
import { limitReached, msg, tr } from "./errors";
import { period } from "./utils";

export type UsageKey = "ideas" | "products" | "videos";

const LIMIT_FIELD = { ideas: "ideasPerMonth", products: "productsPerMonth", videos: "videosPerMonth" } as const;
const LIMIT_TEXT = {
  ideas: msg("You have used all {limit} idea research runs on the {plan} plan this month. Upgrade to keep going."),
  products: msg("You have used all {limit} product generations on the {plan} plan this month. Upgrade to keep going."),
  videos: msg("You have used all {limit} lead videos on the {plan} plan this month. Upgrade to keep going."),
} as const;

export async function getUsage(userId: string) {
  const rows = await db
    .select()
    .from(schema.usage)
    .where(and(eq(schema.usage.userId, userId), eq(schema.usage.period, period())));
  const out: Record<UsageKey, number> = { ideas: 0, products: 0, videos: 0 };
  for (const r of rows) if (r.key in out) out[r.key as UsageKey] = r.count;
  return out;
}

/**
 * Atomically consumes one unit of a monthly quota. The increment and the limit
 * check happen in one statement, so concurrent requests cannot overshoot.
 */
export async function consume(user: { id: string; plan: string }, key: UsageKey) {
  const plan = getPlan(user.plan);
  const limit = plan.limits[LIMIT_FIELD[key]];
  const p = period();
  const rows = await db
    .insert(schema.usage)
    .values({ userId: user.id, period: p, key, count: 1 })
    .onConflictDoUpdate({
      target: [schema.usage.userId, schema.usage.period, schema.usage.key],
      set: { count: sql`${schema.usage.count} + 1` },
      setWhere: sql`${schema.usage.count} < ${limit}`,
    })
    .returning({ count: schema.usage.count });
  if (rows.length === 0 || limit < 1) {
    // Translated where route() answers; the plan name is translated with the sentence.
    throw limitReached(LIMIT_TEXT[key], { limit, plan: tr(plan.name) });
  }
}

/** Gives a unit back when the work it paid for failed. */
export async function refund(userId: string, key: UsageKey) {
  await db
    .update(schema.usage)
    .set({ count: sql`greatest(${schema.usage.count} - 1, 0)` })
    .where(and(eq(schema.usage.userId, userId), eq(schema.usage.period, period()), eq(schema.usage.key, key)));
}
