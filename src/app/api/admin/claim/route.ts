import { z } from "zod";
import { eq } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/crypto";
import { forbidden, msg } from "@/lib/errors";
import { db, schema } from "@/db";

// One-time owner bootstrap: a signed-in user presents ADMIN_BOOTSTRAP_TOKEN
// (set as an environment variable) to become admin. Disabled when unset.
export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit(`claim:${user.id}`, 5, 600);
  const { token } = await body(req, z.object({ token: z.string().min(1).max(200) }));
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expected || expected.length < 24 || !safeEqual(token, expected)) throw forbidden(msg("That token is not valid."));
  // One-time: once an owner exists, further admins are granted from the control panel.
  const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.role, "admin")).limit(1);
  if (existing) throw forbidden(msg("An owner already exists. Ask them to grant you access."));
  await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, user.id));
  return { ok: true };
});
