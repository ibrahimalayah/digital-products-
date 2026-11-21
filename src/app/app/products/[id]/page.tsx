import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { integrations } from "@/lib/env";
import { ProductStudio } from "@/components/studio/product-studio";

export const metadata: Metadata = { title: "Product" };

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/app/products/${id}`);
  const [p] = await db.select().from(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.userId, user.id))).limit(1);
  if (!p) notFound();
  return (
    <>
      <Link href="/app/products" className="mb-6 inline-block text-sm text-muted hover:text-ink">
        ← Products
      </Link>
      <ProductStudio
        isAdmin={user.role === "admin"}
        storeReady={integrations.stripe()}
        initial={{
          id: p.id,
          slug: p.slug,
          title: p.title,
          promise: p.promise,
          audience: p.audience,
          format: p.format,
          tone: p.tone,
          pageSize: p.pageSize,
          accent: p.accent,
          priceCents: p.priceCents,
          status: p.status,
          outline: p.outline,
          sections: p.sections,
        }}
      />
    </>
  );
}
