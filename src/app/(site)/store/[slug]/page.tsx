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
import { Drawing } from "@/components/drawing";
import { isRtl } from "@/lib/languages";
import { appUrl, integrations } from "@/lib/env";
import { ldJson, productJsonLd, productTags } from "@/lib/seo";
import { getSettings } from "@/server/settings";
import Link from "next/link";
import { AButton, LinkButton } from "@/components/ui";
import { money } from "@/lib/format";
import { getI18n, getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await dbReady();
  const p = await getStoreProduct((await params).slug);
  if (!p) {
    const t = await getT();
    return { title: t("Not found") };
  }
  const tags = productTags(p);
  return {
    title: p.title,
    description: `${p.promise} ${p.format}.`.slice(0, 300),
    keywords: [p.title, ...tags],
    alternates: { canonical: `/store/${p.slug}` },
    openGraph: { title: p.title, description: p.promise, type: "website", url: `/store/${p.slug}`, locale: p.language },
    twitter: { card: "summary", title: p.title, description: p.promise },
  };
}

export default async function ProductPage({ params }: Props) {
  await dbReady();
  const p = await getStoreProduct((await params).slug);
  if (!p) notFound();
  const { t, lang } = await getI18n();
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
  const sample = p.sections.filter(Boolean)[0]?.pages[0];
  // The product's own text follows the product's language; interface text follows the visitor's.
  const dir = isRtl(p.language) ? "rtl" : undefined;
  const uiDir = isRtl(lang) ? "rtl" : "ltr";
  const tags = productTags(p);
  const brand = (await getSettings(p.userId)).brandName || "Kitforge";
  const storeOpen = integrations.stripe();

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} />
      </div>
      <div dir={dir}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(productJsonLd(p, `${appUrl()}/store/${p.slug}`, brand)) }} />
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{p.format}</p>
        <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{p.title}</h1>
        <p className="mt-5 text-xl leading-relaxed">{p.promise}</p>
        <p className="mt-3 text-muted">{t("For: {audience}", { audience: p.audience })}</p>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-5xl">{money(p.priceCents)}</p>
            <p className="text-sm text-muted">{t("{n} pages · {size} PDF", { n: pages, size: p.pageSize === "A4" ? "A4" : t("US Letter") })}</p>
          </div>
          <div className="mt-5">
            {owned ? (
              <AButton href={`/api/products/${p.id}/pdf`} size="lg" className="w-full">
                <Download className="size-4" aria-hidden /> {t("Download your PDF")}
              </AButton>
            ) : storeOpen ? (
              <BuyButton slug={p.slug} label={t("Buy for {price}", { price: money(p.priceCents) })} signedIn={Boolean(user)} />
            ) : (
              <LinkButton href={`/app/ideas?niche=${encodeURIComponent(p.title)}`} size="lg" className="w-full">
                {t("Make one like this")}
              </LinkButton>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted" dir={uiDir}>
            {storeOpen
              ? t("Secure checkout by Stripe. Instant download after payment.")
              : t("This is an example made in the studio. Checkout is not open yet; read the free preview below or make your own.")}
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label={t("Tags")} dir="ltr">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-sunken px-2.5 py-1 font-mono text-[11px] text-muted">
                #{tag}
              </li>
            ))}
          </ul>
          {storeOpen && !owned ? (
            <p className="mt-3 text-center text-xs" dir={uiDir}>
              <Link href={`/app/ideas?niche=${encodeURIComponent(p.title)}`} className="text-muted underline hover:text-ink">
                {t("Make one like this in the studio")}
              </Link>
            </p>
          ) : null}
        </div>

        {owned ? null : (
          <div className="mt-4">
            <LeadForm productId={p.id} />
          </div>
        )}

        {sample ? (
          <section className="mt-12" aria-label={t("Free preview")}>
            <h2 className="font-display text-3xl" dir={uiDir}>
              {t("Free preview")}
            </h2>
            <p className="mt-1 text-sm text-muted" dir={uiDir}>
              {t("The first page, exactly as it prints.")}
            </p>
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <h3 className="font-display text-2xl">{sample.heading}</h3>
              {sample.goal ? <p className="mt-1 text-sm text-muted">{sample.goal}</p> : null}
              <div className="mt-4 space-y-4 text-sm leading-relaxed">
                {sample.blocks.slice(0, 3).map((b, i) =>
                  b.type === "drawing" ? (
                    <Drawing key={i} kind={b.text} seed={b.title} t={t} className="w-full max-w-[280px] rounded-lg border border-line" />
                  ) : (
                    <div key={i}>
                      {b.title ? <p className="font-semibold">{b.title}</p> : null}
                      {b.text ? <p className="whitespace-pre-wrap">{b.text}</p> : null}
                      {b.items.length ? (
                        <ul className="mt-1 list-disc space-y-1 ps-5">
                          {b.items.map((it, j) => (
                            <li key={j}>{it}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
              {pages > 1 ? (
                <p className="mt-5 border-t border-line pt-4 text-sm text-muted" dir={uiDir}>
                  {t("{n} more pages in the full PDF.", { n: pages - 1 })}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <h2 className="mt-12 font-display text-3xl">{t("What's inside")}</h2>
        <ol className="mt-5 space-y-5">
          {p.sections.filter(Boolean).map((s, i) => (
            <li key={i} className="rounded-2xl border border-line p-5">
              <p className="font-medium">
                <span className="me-2 font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
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
        {p.outline?.extras.length ? <p className="mt-5 text-sm text-muted">{t("Plus: {extras}.", { extras: p.outline.extras.join(", ") })}</p> : null}
      </div>
    </div>
  );
}
