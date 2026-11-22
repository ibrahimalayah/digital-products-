import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { getI18n, getT } from "@/lib/i18n-server";
import { listLibrary } from "@/server/products";
import { AButton, Empty, LinkButton, Notice, PageHeader } from "@/components/ui";
import { ProductCover } from "@/components/product-cover";
import { shortDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Library") };
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const user = await requireUserPage("/app/library");
  const { purchased } = await searchParams;
  const [items, { t, lang }] = await Promise.all([listLibrary(user.id), getI18n()]);
  return (
    <>
      <PageHeader eyebrow={t("Library")} title={t("Your purchases")} description={t("Everything you bought from the store, ready to download again any time.")} />
      {purchased ? (
        <div className="mb-6">
          <Notice tone="accent">{t("Thank you. Your payment is being confirmed; the download appears here within a few seconds. Refresh if you do not see it yet.")}</Notice>
        </div>
      ) : null}
      {items.length === 0 ? (
        <Empty title={t("Nothing here yet")} body={t("Kits you buy from the store show up here.")} action={<LinkButton href="/store">{t("Browse the store")}</LinkButton>} />
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.orderId}>
              <ProductCover title={it.title} subtitle={it.promise} accent={it.accent} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{t("Bought {date}", { date: shortDate(it.purchasedAt, lang) })}</span>
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
