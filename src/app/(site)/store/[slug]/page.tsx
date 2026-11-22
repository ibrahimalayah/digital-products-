import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Check, Download } from "lucide-react";
import { db, dbReady, schema } from "@/db";
import { getStoreProduct } from "@/server/products";
import { getUser } from "@/lib/session";
import { ProductCover } from "@/components/product-cover";
import { BuyButton } from "@/components/buy-button";
import { LeadForm } from "@/components/lead-form";
import { AButton } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await dbReady();
  const p = await getStoreProduct((await params).slug);
  return p ? { title: p.title, description: p.promise } : { title: "Not found" };
}

export default async function ProductPage({ params }: Props) {
  await dbReady();
  const p = await getStoreProduct((await params).slug);
  if (!p) notFound();
  const user = await getUser();
  let owned = false;
  if (user) {
    const [o] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.userId, user.id), eq(schema.orders.productId, p.id), eq(schema.orders.status, "paid")))
      .limit(1);
    owned = Boolean(o) || p.userId === user.id;
  }
  const pages = p.sections.filter(Boolean).reduce((n, s) => n + s.pages.length, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} />
      </div>
      <div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{p.format}</p>
        <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{p.title}</h1>
        <p className="mt-5 text-xl leading-relaxed">{p.promise}</p>
        <p className="mt-3 text-muted">For: {p.audience}</p>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-5xl">{money(p.priceCents)}</p>
            <p className="text-sm text-muted">
              {pages} pages · {p.pageSize === "A4" ? "A4" : "US Letter"} PDF
            </p>
          </div>
          <div className="mt-5">
            {owned ? (
              <AButton href={`/api/products/${p.id}/pdf`} size="lg" className="w-full">
                <Download className="size-4" aria-hidden /> Download your PDF
              </AButton>
            ) : (
              <BuyButton slug={p.slug} label={`Buy for ${money(p.priceCents)}`} signedIn={Boolean(user)} />
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted">Secure checkout by Stripe. Instant download after payment.</p>
        </div>

        {owned ? null : (
          <div className="mt-4">
            <LeadForm productId={p.id} />
          </div>
        )}

        <h2 className="mt-12 font-display text-3xl">What&apos;s inside</h2>
        <ol className="mt-5 space-y-5">
          {p.sections.filter(Boolean).map((s, i) => (
            <li key={i} className="rounded-2xl border border-line p-5">
              <p className="font-medium">
                <span className="mr-2 font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-muted">{s.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {s.pages.map((pg, j) => (
                  <li key={j} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    {pg.heading}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {p.outline?.extras.length ? <p className="mt-5 text-sm text-muted">Plus: {p.outline.extras.join(", ")}.</p> : null}
      </div>
    </div>
  );
}
