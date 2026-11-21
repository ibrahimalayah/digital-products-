import { NextResponse } from "next/server";
import { dbReady } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { runAutopilot } from "@/server/autopilot";

export const maxDuration = 300;

// Invoked by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbReady();
  const report = await runAutopilot();
  return NextResponse.json({ ok: true, report });
}
