import type { Metadata } from "next";
import Link from "next/link";
import { dbReady } from "@/db";
import { listStore } from "@/server/products";
import { ProductCover } from "@/components/product-cover";
import { Empty, LinkButton } from "@/components/ui";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Store" };
export const dynamic = "force-dynamic";

export default async function Store() {
  await dbReady();
  const items = await listStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Store</p>
      <h1 className="max-w-2xl font-display text-5xl leading-none tracking-tight sm:text-6xl">Printable kits that get one job done.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">Instant PDF download. Print at home in Letter or A4.</p>
      {items.length === 0 ? (
        <div className="mt-12">
          <Empty title="The shelves are being stocked" body="New kits are on the way. Create an account and you can build your own in the studio today." action={<LinkButton href="/sign-up">Open the studio</LinkButton>} />
        </div>
      ) : (
        <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/store/${p.slug}`} className="group block">
                <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} className="transition-transform duration-200 group-hover:-translate-y-1" />
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
