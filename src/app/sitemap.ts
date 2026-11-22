import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db, dbReady, schema } from "@/db";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Every public page, including each published product, for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/store`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    await dbReady();
    const products = await db
      .select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt })
      .from(schema.products)
      .where(eq(schema.products.status, "published"))
      .orderBy(desc(schema.products.updatedAt))
      .limit(1000);
    for (const p of products) pages.push({ url: `${base}/store/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 });
  } catch {
    // The static pages are still worth listing if the database is unreachable.
  }
  return pages;
}
