import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { writeVideoScript } from "@/lib/ai";
import { consume, refund } from "@/lib/usage";
import { badRequest, notFound } from "@/lib/errors";
import { newId } from "@/lib/utils";
import { logRun } from "./agents-log";
import { getOwnedProduct } from "./products";
import { getSettings } from "./settings";
import type { CurrentUser } from "@/lib/session";
import type { VideoScene } from "@/lib/types";

export type Video = typeof schema.videos.$inferSelect;

export type VideoInput = { productId: string; seconds: number; goal: "leads" | "sales"; voice: string };

/** Writes the script for a short lead video. Consumes one monthly video credit.
 * The built-in voice speaks English only, so other languages start as captions-only. */
export async function createVideo(user: CurrentUser, input: VideoInput): Promise<Video> {
  const p = await getOwnedProduct(user.id, input.productId);
  await consume(user, "videos");
  try {
    const s = await getSettings(user.id);
    const { title, script } = await writeVideoScript({
      product: { title: p.title, promise: p.promise, audience: p.audience, format: p.format, tone: p.tone, language: p.language, priceUsd: p.priceCents / 100 },
      goal: input.goal,
      seconds: input.seconds,
      brandVoice: s.brandVoice,
    });
    if (script.scenes.length < 2) throw badRequest("The script came back empty. Try again.");
    const [row] = await db
      .insert(schema.videos)
      .values({ id: newId("vid"), userId: user.id, productId: p.id, title, goal: input.goal, seconds: input.seconds, voice: p.language === "en" ? input.voice : "none", script })
      .returning();
    await logRun(user.id, "video-writer", "ok", `Wrote a ${input.seconds}-second video script for "${p.title.slice(0, 60)}".`);
    return row;
  } catch (e) {
    await refund(user.id, "videos");
    await logRun(user.id, "video-writer", "error", `Video script failed for "${p.title.slice(0, 60)}".`);
    throw e;
  }
}

export function listVideos(userId: string) {
  return db
    .select({ video: schema.videos, productTitle: schema.products.title })
    .from(schema.videos)
    .innerJoin(schema.products, eq(schema.products.id, schema.videos.productId))
    .where(eq(schema.videos.userId, userId))
    .orderBy(desc(schema.videos.createdAt))
    .limit(100);
}

export async function getVideo(userId: string, id: string) {
  const [row] = await db
    .select({ video: schema.videos, product: schema.products })
    .from(schema.videos)
    .innerJoin(schema.products, eq(schema.products.id, schema.videos.productId))
    .where(and(eq(schema.videos.id, id), eq(schema.videos.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Video");
  return row;
}

/** Saves the owner's edits to the script or voice. */
export async function updateVideo(userId: string, id: string, patch: { scenes?: VideoScene[]; voice?: string }): Promise<Video> {
  const { video } = await getVideo(userId, id);
  const [row] = await db
    .update(schema.videos)
    .set({
      voice: patch.voice ?? video.voice,
      script: patch.scenes ? { ...video.script, scenes: patch.scenes } : video.script,
    })
    .where(and(eq(schema.videos.id, id), eq(schema.videos.userId, userId)))
    .returning();
  return row;
}

export async function deleteVideo(userId: string, id: string) {
  await db.delete(schema.videos).where(and(eq(schema.videos.id, id), eq(schema.videos.userId, userId)));
}
