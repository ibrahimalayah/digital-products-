import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { dbReady } from "@/db";
import { listStore } from "@/server/products";
import { ProductCover } from "@/components/product-cover";
import { Empty, LinkButton } from "@/components/ui";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand.generated";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Store" };
export const dynamic = "force-dynamic";

export default async function Store() {
  await dbReady();
  const items = await listStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rise relative overflow-hidden rounded-[32px] border border-line bg-sunken">
        {BRAND.store ? (
          <Image src={BRAND.store} alt="A row of printed kits with coloured covers" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0" aria-hidden>
            <div className="grain absolute inset-0 opacity-70" />
            <div className="absolute -bottom-10 right-6 hidden gap-4 md:flex">
              {["#17604f", "#1d3f72", "#8a2f3b", "#a0611a"].map((c, i) => (
                <div key={c} className="h-56 w-40 rounded-xl border border-line bg-surface shadow-lift" style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }}>
                  <div className="h-1/2 rounded-t-xl" style={{ backgroundColor: c }} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={cn("relative max-w-xl px-7 py-14 sm:px-12 sm:py-20", BRAND.store ? "bg-gradient-to-r from-bg/95 via-bg/80 to-transparent" : "")}>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Store</p>
          <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">Printable kits that get one job done.</h1>
          <p className="mt-5 text-lg text-muted">Instant PDF download. Print at home in Letter or A4.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="mt-12">
          <Empty title="The shelves are being stocked" body="New kits are on the way. Create an account and you can build your own in the studio today." action={<LinkButton href="/sign-up">Open the studio</LinkButton>} />
        </div>
      ) : (
        <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/store/${p.slug}`} className="group block">
                <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} className="lift" />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium leading-snug group-hover:text-accent">{p.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{p.promise}</p>
                  </div>
                  <span className="font-mono text-sm tabular-nums">{money(p.priceCents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
