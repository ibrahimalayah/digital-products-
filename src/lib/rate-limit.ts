import { sql, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { tooMany } from "./errors";

/**
 * Fixed-window limiter backed by Postgres, so limits hold across serverless
 * instances. `limit` requests per `windowSec` for a given key.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (windowSec * 1000)) * windowSec * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count });
  if (Math.random() < 0.02) {
    await db.delete(schema.rateLimits).where(lt(schema.rateLimits.windowStart, new Date(now - 86_400_000)));
  }
  if (row.count > limit) throw tooMany();
}
