import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { msg } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { listProducts } from "@/server/products";
import { Badge, Empty, LinkButton, PageHeader, statusTone } from "@/components/ui";
import { ProductCover } from "@/components/product-cover";
import { money } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Products") };
}

// Display names for product status ids; the ids themselves stay as stored.
const STATUS: Record<string, string> = {
  draft: msg("draft"),
  generating: msg("generating"),
  ready: msg("ready"),
  published: msg("published"),
  failed: msg("failed"),
};

export default async function Products() {
  const user = await requireUserPage("/app/products");
  const [items, t] = await Promise.all([listProducts(user.id), getT()]);
  return (
    <>
      <PageHeader
        eyebrow={t("Products")}
        title={t("Your product line")}
        description={t("Every product starts as a brief. The writer turns it into finished pages you can export as a PDF.")}
        actions={
          <LinkButton href="/app/products/new">
            <Plus className="size-4" aria-hidden /> {t("New product")}
          </LinkButton>
        }
      />
      {items.length === 0 ? (
        <Empty title={t("Nothing on the shelf yet")} body={t("Start from an idea in the lab, or write your own brief.")} action={<LinkButton href="/app/ideas">{t("Go to the idea lab")}</LinkButton>} />
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/app/products/${p.id}`} className="group block">
                <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} className="lift" />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge tone={statusTone(p.status)}>{t(STATUS[p.status] ?? p.status)}</Badge>
                  <span className="font-mono text-sm">{money(p.priceCents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
