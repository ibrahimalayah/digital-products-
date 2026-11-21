import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { listLibrary } from "@/server/products";
import { AButton, Empty, LinkButton, Notice, PageHeader } from "@/components/ui";
import { ProductCover } from "@/components/product-cover";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const user = await requireUserPage("/app/library");
  const { purchased } = await searchParams;
  const items = await listLibrary(user.id);
  return (
    <>
      <PageHeader eyebrow="Library" title="Your purchases" description="Everything you bought from the store, ready to download again any time." />
      {purchased ? (
        <div className="mb-6">
          <Notice tone="accent">Thank you. Your payment is being confirmed; the download appears here within a few seconds. Refresh if you do not see it yet.</Notice>
        </div>
      ) : null}
      {items.length === 0 ? (
        <Empty title="Nothing here yet" body="Kits you buy from the store show up here." action={<LinkButton href="/store">Browse the store</LinkButton>} />
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.orderId}>
              <ProductCover title={it.title} subtitle={it.promise} accent={it.accent} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">Bought {shortDate(it.purchasedAt)}</span>
                <AButton href={`/api/products/${it.productId}/pdf`} size="sm" variant="secondary">
                  <Download className="size-3.5" aria-hidden /> PDF
                </AButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
