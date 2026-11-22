import { NextResponse } from "next/server";
import { dbReady } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { seedShowcase } from "@/server/showcase";

export const maxDuration = 60;

// Fills the public store with the example products. Protected by the cron
// secret; safe to call more than once.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbReady();
  return NextResponse.json(await seedShowcase());
}
