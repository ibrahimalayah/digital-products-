import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, dbReady, schema } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { chainProviders, completeJson } from "@/lib/ai-chain";

export const maxDuration = 120;

// A deployment check for the owner: is the database migrated and does an AI
// provider really answer? Protected by the cron secret. Returns no secrets.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report: Record<string, unknown> = {};
  try {
    await dbReady();
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.videos);
    const [leads] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.leads);
    const [lang] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(sql`${schema.products.language} is not null`);
    report.database = { ok: true, videos: row.n, leads: leads.n, productsWithLanguage: lang.n };
  } catch (e) {
    report.database = { ok: false, error: (e as Error).message.slice(0, 120) };
  }
  const providers = chainProviders();
  const started = Date.now();
  const ai = await completeJson(
    z.object({ ideas: z.array(z.string()) }),
    "You name small printable products.",
    "Give two short product names for new puppy owners.",
    300,
    providers,
    100_000,
  );
  report.ai = {
    configured: providers.map((p) => p.name),
    ok: ai.ok,
    answeredBy: ai.ok ? ai.provider : null,
    seconds: Math.round((Date.now() - started) / 1000),
  };
  return NextResponse.json(report);
}
