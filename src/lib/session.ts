import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "./auth";
import { db, dbReady, schema } from "@/db";
import { forbidden, unauthorized } from "./errors";

export type CurrentUser = typeof schema.user.$inferSelect;

/** Returns the signed-in user with fresh role/plan from the database, or null. */
export async function getUser(): Promise<CurrentUser | null> {
  const h = await headers(); // read first: marks the page as per-request before any database work
  await dbReady();
  const s = await getAuth().api.getSession({ headers: h });
  if (!s) return null;
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, s.user.id)).limit(1);
  if (!u || u.suspended) return null;
  return u;
}

/** For pages: redirects to sign-in when signed out. */
export async function requireUserPage(next = "/app"): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const u = await requireUserPage("/admin");
  if (u.role !== "admin") redirect("/app");
  return u;
}

/** For API routes: throws AppError. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) throw unauthorized();
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "admin") throw forbidden();
  return u;
}
