import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { researchIdeas } from "@/lib/ai";
import { consume, refund } from "@/lib/usage";
import { notFound } from "@/lib/errors";
import { newId } from "@/lib/utils";
import { logRun } from "./agents-log";
import { getSettings } from "./settings";
import type { CurrentUser } from "@/lib/session";

export async function runIdeaResearch(user: CurrentUser, niche: string) {
  await consume(user, "ideas");
  try {
    const s = await getSettings(user.id);
    const drafts = await researchIdeas(niche, s.brandVoice);
    const rows = drafts.map((d) => ({
      id: newId("idea"),
      userId: user.id,
      niche,
      title: d.title.slice(0, 140),
      promise: d.promise.slice(0, 400),
      audience: d.audience.slice(0, 400),
      format: d.format.slice(0, 400),
      proof: d.proof.slice(0, 800),
      suggestedPriceCents: Math.min(49, Math.max(5, Math.round(d.suggestedPriceUsd || 9))) * 100,
    }));
    if (rows.length) await db.insert(schema.ideas).values(rows);
    await logRun(user.id, "idea-scout", "ok", `Found ${rows.length} product ideas for "${niche.slice(0, 60)}".`);
    return rows;
  } catch (e) {
    await refund(user.id, "ideas");
    await logRun(user.id, "idea-scout", "error", `Idea research failed for "${niche.slice(0, 60)}".`);
    throw e;
  }
}

export function listIdeas(userId: string) {
  return db.select().from(schema.ideas).where(eq(schema.ideas.userId, userId)).orderBy(desc(schema.ideas.createdAt)).limit(120);
}

export async function getIdea(userId: string, id: string) {
  const [row] = await db.select().from(schema.ideas).where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId))).limit(1);
  if (!row) throw notFound("Idea");
  return row;
}

export async function deleteIdea(userId: string, id: string) {
  await db.delete(schema.ideas).where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId)));
}
