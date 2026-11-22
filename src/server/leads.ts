import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "@/lib/utils";

/**
 * Records that someone wants to hear about a product. Only published products
 * collect leads. The answer is the same whether or not the address was already
 * there, so the form cannot be used to find out who signed up.
 */
export async function addLead(productId: string, email: string) {
  const [p] = await db
    .select({ id: schema.products.id, userId: schema.products.userId })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.status, "published")))
    .limit(1);
  if (!p) return;
  await db.insert(schema.leads).values({ id: newId("lead"), userId: p.userId, productId: p.id, email: email.toLowerCase() }).onConflictDoNothing();
}

export function listLeads(userId: string) {
  return db
    .select({ id: schema.leads.id, email: schema.leads.email, createdAt: schema.leads.createdAt, productTitle: schema.products.title })
    .from(schema.leads)
    .innerJoin(schema.products, eq(schema.products.id, schema.leads.productId))
    .where(eq(schema.leads.userId, userId))
    .orderBy(desc(schema.leads.createdAt))
    .limit(5000);
}

export async function countLeads(userId: string) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.leads).where(eq(schema.leads.userId, userId));
  return row.n;
}

export async function deleteLead(userId: string, id: string) {
  await db.delete(schema.leads).where(and(eq(schema.leads.id, id), eq(schema.leads.userId, userId)));
}

/** Spreadsheet programs run cells that start with = + - or @ as formulas; a leading quote stops that. */
const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

export function leadsCsv(rows: Awaited<ReturnType<typeof listLeads>>) {
  return ["email,product,signed_up", ...rows.map((r) => [cell(r.email), cell(r.productTitle), cell(r.createdAt.toISOString())].join(","))].join("\r\n") + "\r\n";
}
