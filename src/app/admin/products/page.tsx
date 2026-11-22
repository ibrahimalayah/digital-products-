import type { Metadata } from "next";
import Link from "next/link";
import { adminProducts } from "@/server/admin";
import { Badge, Empty, PageHeader, statusTone } from "@/components/ui";
import { UnpublishButton } from "@/components/admin";
import { money, shortDate } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";

// Product statuses as stored; shown through t().
const STATUS: Record<string, string> = {
  draft: msg("draft"),
  outlined: msg("outlined"),
  generating: msg("generating"),
  ready: msg("ready"),
  published: msg("published"),
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Products") };
}

export default async function AdminProducts() {
  const t = await getT();
  const products = await adminProducts();
  return (
    <>
      <PageHeader eyebrow={t("Control panel")} title={t("All products")} description={t("Every product on the platform. Publish your own from the product studio; unpublish anything here.")} />
      {products.length === 0 ? (
        <Empty title={t("No products yet")} body={t("Products created in any workspace are listed here.")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Product")}</th>
                <th className="px-4 py-3 font-medium">{t("Owner")}</th>
                <th className="px-4 py-3 font-medium">{t("Created")}</th>
                <th className="px-4 py-3 font-medium">{t("Price")}</th>
                <th className="px-4 py-3 font-medium">{t("Sales")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">
                    {p.status === "published" ? (
                      <Link href={`/store/${p.slug}`} className="hover:text-accent">
                        {p.title}
                      </Link>
                    ) : (
                      p.title
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.owner}</td>
                  <td className="px-4 py-3 text-muted">{shortDate(p.createdAt)}</td>
                  <td className="px-4 py-3 font-mono">{money(p.priceCents)}</td>
                  <td className="px-4 py-3 font-mono">{p.salesCount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>{t(STATUS[p.status] ?? p.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-end">{p.status === "published" ? <UnpublishButton id={p.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
