import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { getPlan } from "@/lib/plans";
import { generateDayPosts, publishPost, releaseStuckPosts } from "./campaigns";
import { getPostizKey } from "./settings";
import { logRun } from "./agents-log";

export type AutopilotReport = { users: number; campaigns: number; written: number; published: number; failed: number };

/**
 * The daily autopilot. For every creator who switched it on (and whose plan
 * includes it): write today's posts for each active campaign, then publish
 * the ones that are approved, or everything when auto-approve is on.
 * Safe to run more than once a day.
 */
export async function runAutopilot(now = new Date()): Promise<AutopilotReport> {
  const report: AutopilotReport = { users: 0, campaigns: 0, written: 0, published: 0, failed: 0 };
  await releaseStuckPosts(now);
  const owners = await db
    .select({ user: schema.user, settings: schema.settings })
    .from(schema.settings)
    .innerJoin(schema.user, eq(schema.settings.userId, schema.user.id))
    .where(and(eq(schema.settings.autopilot, true), eq(schema.user.suspended, false)));

  for (const { user, settings } of owners) {
    const plan = getPlan(user.plan);
    if (!plan.limits.autopilot) continue;
    report.users++;
    const active = await db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.userId, user.id), eq(schema.campaigns.status, "active")))
      .limit(plan.limits.campaigns);
    const key = await getPostizKey(user.id);
    const autoApprove = settings.autoApprove && plan.id === "business";

    for (const c of active) {
      report.campaigns++;
      try {
        const posts = await generateDayPosts(user, c.id, now);
        report.written += posts.length;
      } catch (e) {
        // "Already written today" is the normal second-run outcome.
        if (!(e instanceof Error && "code" in e && (e as { code: string }).code === "limit_reached")) {
          report.failed++;
          await logRun(user.id, "daily-poster", "error", `Could not write posts for "${c.name.slice(0, 60)}".`);
        }
      }
      if (!key) continue;
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const due = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(
          and(
            eq(schema.posts.campaignId, c.id),
            inArray(schema.posts.status, autoApprove ? ["draft", "approved"] : ["approved"]),
            gte(schema.posts.scheduledAt, from),
            lt(schema.posts.scheduledAt, new Date(from.getTime() + 86_400_000)),
          ),
        );
      let sent = 0;
      for (const p of due) {
        try {
          const out = await publishPost(user.id, p.id, key);
          if (out.status === "scheduled") sent++;
        } catch {
          report.failed++;
        }
      }
      if (sent) {
        report.published += sent;
        await logRun(user.id, "publisher", "ok", `Scheduled ${sent} post${sent === 1 ? "" : "s"} to Postiz for "${c.name.slice(0, 60)}".`);
      }
    }
  }
  return report;
}
