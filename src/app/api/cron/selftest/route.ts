import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, dbReady, schema } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { chainProviders, completeJson } from "@/lib/ai-chain";
import { renderProductPdf } from "@/lib/pdf";

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
  // Arabic needs its font file on the server; this proves it shipped with the deployment.
  try {
    const pdf = await renderProductPdf({
      title: "اختبار",
      promise: "اختبار",
      audience: "اختبار",
      pageSize: "A4",
      accent: "#1d3f72",
      outline: null,
      brand: "Kitforge",
      language: "ar",
      sections: [{ title: "قسم", summary: "ملخص", pages: [{ heading: "صفحة", goal: "", blocks: [{ type: "drawing", title: "متاهة", text: "maze", items: [] }] }] }],
    });
    report.arabicPdf = { ok: true, bytes: pdf.length };
  } catch (e) {
    report.arabicPdf = { ok: false, error: (e as Error).message.slice(0, 160) };
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
