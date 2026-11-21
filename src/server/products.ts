import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { writeOutline, writeSection } from "@/lib/ai";
import { consume, refund } from "@/lib/usage";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { newId, slugify } from "@/lib/utils";
import { logRun } from "./agents-log";
import type { CurrentUser } from "@/lib/session";

export type Product = typeof schema.products.$inferSelect;

export type ProductInput = {
  title: string;
  promise: string;
  audience: string;
  format: string;
  tone?: string;
  pageSize?: "LETTER" | "A4";
  priceCents?: number;
  ideaId?: string;
};

export async function createProduct(user: CurrentUser, input: ProductInput): Promise<Product> {
  const id = newId("prod");
  const slug = `${slugify(input.title)}-${id.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
  const [row] = await db
    .insert(schema.products)
    .values({
      id,
      userId: user.id,
      slug,
      title: input.title,
      promise: input.promise,
      audience: input.audience,
      format: input.format,
      tone: input.tone || undefined,
      pageSize: input.pageSize || "LETTER",
      priceCents: input.priceCents ?? 900,
      ideaId: input.ideaId,
    })
    .returning();
  return row;
}

export async function getOwnedProduct(userId: string, id: string): Promise<Product> {
  const [row] = await db.select().from(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.userId, userId))).limit(1);
  if (!row) throw notFound("Product");
  return row;
}

export function listProducts(userId: string) {
  return db.select().from(schema.products).where(eq(schema.products.userId, userId)).orderBy(desc(schema.products.createdAt)).limit(200);
}

const briefOf = (p: Product) => ({ title: p.title, promise: p.promise, audience: p.audience, format: p.format, tone: p.tone });

/** Step 1 of generation. Consumes one monthly product credit. */
export async function generateOutline(user: CurrentUser, id: string): Promise<Product> {
  const p = await getOwnedProduct(user.id, id);
  if (p.status === "published") throw badRequest("Unpublish the product before regenerating it.");
  await consume(user, "products");
  try {
    const outline = await writeOutline(briefOf(p));
    if (!outline.sections.length) throw badRequest("The outline came back empty. Try again.");
    const [row] = await db
      .update(schema.products)
      .set({ outline, sections: [], status: "generating" })
      .where(eq(schema.products.id, p.id))
      .returning();
    return row;
  } catch (e) {
    await refund(user.id, "products");
    await logRun(user.id, "product-writer", "error", `Outline failed for "${p.title.slice(0, 60)}".`);
    throw e;
  }
}

/** Step 2..n. Writes one section; the client calls this once per section so no request runs long. */
export async function generateSection(user: CurrentUser, id: string, index: number): Promise<Product> {
  const p = await getOwnedProduct(user.id, id);
  if (!p.outline) throw badRequest("Generate the outline first.");
  if (p.status !== "generating") throw badRequest("This product is not being generated.");
  if (index < 0 || index >= p.outline.sections.length) throw badRequest("Section does not exist.");
  // One write per section per outline. Rewriting means a new outline, which costs a product credit.
  if (p.sections[index]) throw badRequest("This section is already written. Regenerate the product to rewrite it.");
  const section = await writeSection(briefOf(p), p.outline, index);
  const fresh = await getOwnedProduct(user.id, id);
  const sections = [...fresh.sections];
  sections[index] = section;
  const done = fresh.outline!.sections.every((_, i) => Boolean(sections[i]));
  const [row] = await db
    .update(schema.products)
    .set({ sections, status: done ? "ready" : "generating" })
    .where(eq(schema.products.id, p.id))
    .returning();
  if (done) await logRun(user.id, "product-writer", "ok", `Finished writing "${p.title.slice(0, 80)}".`);
  return row;
}

export async function updateProduct(
  user: CurrentUser,
  id: string,
  patch: Partial<Pick<Product, "title" | "promise" | "audience" | "format" | "tone" | "pageSize" | "priceCents" | "accent">> & {
    published?: boolean;
  },
): Promise<Product> {
  const p = await getOwnedProduct(user.id, id);
  const { published, ...fields } = patch;
  const set: Partial<typeof schema.products.$inferInsert> = { ...fields };
  if (published !== undefined) {
    // The public store sells the platform owner's catalog only.
    if (user.role !== "admin") throw forbidden("Only the store owner can publish to the public store.");
    if (published) {
      if (p.status !== "ready" && p.status !== "published") throw badRequest("Finish generating the product before publishing.");
      if ((fields.priceCents ?? p.priceCents) < 100) throw badRequest("Set a price of at least $1 before publishing.");
      set.status = "published";
    } else if (p.status === "published") set.status = "ready";
  }
  if (Object.keys(set).length === 0) return p;
  const [row] = await db.update(schema.products).set(set).where(eq(schema.products.id, p.id)).returning();
  return row;
}

export async function deleteProduct(user: CurrentUser, id: string) {
  const p = await getOwnedProduct(user.id, id);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(eq(schema.orders.productId, p.id));
  if (n > 0) throw badRequest("This product has buyers, so it cannot be deleted. Unpublish it instead.");
  await db.delete(schema.products).where(eq(schema.products.id, p.id));
}

/* ───────────── Store (public) ───────────── */

export function listStore() {
  return db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      title: schema.products.title,
      promise: schema.products.promise,
      audience: schema.products.audience,
      format: schema.products.format,
      priceCents: schema.products.priceCents,
      accent: schema.products.accent,
      outline: schema.products.outline,
    })
    .from(schema.products)
    .where(eq(schema.products.status, "published"))
    .orderBy(desc(schema.products.updatedAt))
    .limit(100);
}

export async function getStoreProduct(slug: string) {
  const [row] = await db.select().from(schema.products).where(and(eq(schema.products.slug, slug), eq(schema.products.status, "published"))).limit(1);
  return row ?? null;
}

/** Who may download the PDF: the creator, a buyer with a paid order, or an admin. */
export async function canDownload(user: CurrentUser, productId: string): Promise<Product | null> {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!p) return null;
  if (p.userId === user.id || user.role === "admin") return p;
  const [order] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.productId, productId), eq(schema.orders.userId, user.id), eq(schema.orders.status, "paid")))
    .limit(1);
  return order ? p : null;
}

export function listLibrary(userId: string) {
  return db
    .select({
      orderId: schema.orders.id,
      purchasedAt: schema.orders.createdAt,
      amountCents: schema.orders.amountCents,
      productId: schema.products.id,
      title: schema.products.title,
      promise: schema.products.promise,
      accent: schema.products.accent,
    })
    .from(schema.orders)
    .innerJoin(schema.products, eq(schema.orders.productId, schema.products.id))
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "paid")))
    .orderBy(desc(schema.orders.createdAt));
}
