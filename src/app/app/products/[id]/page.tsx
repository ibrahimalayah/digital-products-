import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { integrations } from "@/lib/env";
import { ProductStudio } from "@/components/studio/product-studio";
import { Card, LinkButton } from "@/components/ui";

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
      {p.status === "ready" || p.status === "published" ? (
        <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-display text-2xl">Now bring people to it</h2>
            <p className="mt-1 text-sm text-muted">Your product is finished. A short video and a daily posting plan are the two fastest ways to get it seen.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/app/videos?product=${p.id}`}>Make a lead video</LinkButton>
            <LinkButton href={`/app/campaigns/new?product=${p.id}`} variant="secondary">
              Plan a campaign
            </LinkButton>
          </div>
        </Card>
      ) : null}
    </>
  );
}
