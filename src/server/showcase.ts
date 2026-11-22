import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId, slugify } from "@/lib/utils";
import type { ProductOutline, ProductSection } from "@/lib/types";
import { STARTER_FULL } from "./starter";
import generated from "./showcase.json";

// Example products for the public store, so visitors see what the studio makes.
// showcase.json holds products written by the product writer and exported from
// a local copy; the hand-written starter product is added to them.

type Example = {
  title: string;
  promise: string;
  audience: string;
  format: string;
  tone?: string;
  pageSize?: string;
  accent?: string;
  priceCents: number;
  language?: string;
  outline: ProductOutline;
  sections: ProductSection[];
};

export const EXAMPLES: Example[] = [{ ...STARTER_FULL, language: "en" }, ...(generated as unknown as Example[])];

// Until an owner has claimed the site, examples belong to this placeholder. It
// has no password, so nobody can sign in as it.
const PLACEHOLDER = { id: "usr_showcase", name: "Kitforge Studio", email: "showcase@kitforge.invalid" };

const shortHash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 6);

/** A stable address for an example: readable when the title is in Latin letters. */
export function exampleSlug(e: { title: string; language?: string }) {
  const base = slugify(e.title);
  return base === "product" ? `${e.language ?? "kit"}-kit-${shortHash(e.title)}` : `${base}-${shortHash(e.title)}`;
}

/**
 * Publishes any example that is not in the store yet. Safe to run again: it
 * adds only what is missing, and once an owner exists it hands the examples
 * (and any leads they collected) over to that owner.
 */
export async function seedShowcase() {
  const [admin] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.role, "admin")).orderBy(schema.user.createdAt).limit(1);
  if (!admin) await db.insert(schema.user).values(PLACEHOLDER).onConflictDoNothing();
  const ownerId = admin?.id ?? PLACEHOLDER.id;

  let moved = 0;
  if (admin) {
    const rows = await db.update(schema.products).set({ userId: admin.id }).where(eq(schema.products.userId, PLACEHOLDER.id)).returning({ id: schema.products.id });
    await db.update(schema.leads).set({ userId: admin.id }).where(eq(schema.leads.userId, PLACEHOLDER.id));
    moved = rows.length;
  }

  const slugs = EXAMPLES.map(exampleSlug);
  const present = new Set((await db.select({ slug: schema.products.slug }).from(schema.products).where(inArray(schema.products.slug, slugs))).map((r) => r.slug));
  const added: string[] = [];
  for (const e of EXAMPLES) {
    const slug = exampleSlug(e);
    if (present.has(slug)) continue;
    await db.insert(schema.products).values({
      id: newId("prod"),
      userId: ownerId,
      slug,
      title: e.title,
      promise: e.promise,
      audience: e.audience,
      format: e.format,
      tone: e.tone || undefined,
      pageSize: e.pageSize || "LETTER",
      accent: e.accent || undefined,
      priceCents: e.priceCents,
      language: e.language || "en",
      status: "published",
      outline: e.outline,
      sections: e.sections,
    });
    added.push(e.title);
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(and(eq(schema.products.status, "published")));
  return { owner: admin ? "site owner" : "placeholder (no owner has claimed the site yet)", examples: EXAMPLES.length, added, movedToOwner: moved, publishedInStore: n };
}
