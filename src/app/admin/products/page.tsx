import type { Metadata } from "next";
import Link from "next/link";
import { adminProducts } from "@/server/admin";
import { Badge, Empty, PageHeader, statusTone } from "@/components/ui";
import { UnpublishButton } from "@/components/admin";
import { money, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProducts() {
  const products = await adminProducts();
  return (
    <>
      <PageHeader eyebrow="Control panel" title="All products" description="Every product on the platform. Publish your own from the product studio; unpublish anything here." />
      {products.length === 0 ? (
        <Empty title="No products yet" body="Products created in any workspace are listed here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{p.status === "published" ? <UnpublishButton id={p.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
