import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { badRequest, msg, notFound } from "@/lib/errors";
import type { PlanId } from "@/lib/types";

export async function adminStats() {
  const [[users], [paying], [products], [published], [orders], [campaigns], [posts]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.user),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.user).where(sql`${schema.user.plan} <> 'free'`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.products),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.status, "published")),
    db
      .select({ n: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${schema.orders.amountCents}),0)::int` })
      .from(schema.orders)
      .where(eq(schema.orders.status, "paid")),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.campaigns).where(eq(schema.campaigns.status, "active")),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.posts).where(eq(schema.posts.status, "scheduled")),
  ]);
  return {
    users: users.n,
    paying: paying.n,
    products: products.n,
    published: published.n,
    orders: orders.n,
    revenueCents: orders.revenue,
    activeCampaigns: campaigns.n,
    postsScheduled: posts.n,
  };
}

export function adminUsers() {
  return db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      plan: schema.user.plan,
      suspended: schema.user.suspended,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))
    .limit(500);
}

export async function adminUpdateUser(actorId: string, id: string, patch: { plan?: PlanId; role?: "user" | "admin"; suspended?: boolean }) {
  if (id === actorId && (patch.role === "user" || patch.suspended)) {
    throw badRequest(msg("You cannot remove your own admin access or suspend yourself."));
  }
  const [row] = await db.update(schema.user).set(patch).where(eq(schema.user.id, id)).returning({ id: schema.user.id });
  if (!row) throw notFound("User");
  if (patch.suspended) await db.delete(schema.session).where(eq(schema.session.userId, id));
}

export function adminOrders() {
  return db
    .select({
      id: schema.orders.id,
      createdAt: schema.orders.createdAt,
      amountCents: schema.orders.amountCents,
      status: schema.orders.status,
      buyer: schema.user.email,
      product: schema.products.title,
    })
    .from(schema.orders)
    .innerJoin(schema.user, eq(schema.orders.userId, schema.user.id))
    .innerJoin(schema.products, eq(schema.orders.productId, schema.products.id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(500);
}

export function adminProducts() {
  return db
    .select({
      id: schema.products.id,
      title: schema.products.title,
      slug: schema.products.slug,
      status: schema.products.status,
      priceCents: schema.products.priceCents,
      salesCount: schema.products.salesCount,
      owner: schema.user.email,
      createdAt: schema.products.createdAt,
    })
    .from(schema.products)
    .innerJoin(schema.user, eq(schema.products.userId, schema.user.id))
    .orderBy(desc(schema.products.createdAt))
    .limit(500);
}

/** Admin takedown of any published product. */
export async function adminUnpublish(id: string) {
  const [row] = await db.update(schema.products).set({ status: "ready" }).where(eq(schema.products.id, id)).returning({ id: schema.products.id });
  if (!row) throw notFound("Product");
}
