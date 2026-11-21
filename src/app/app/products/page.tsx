import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { listProducts } from "@/server/products";
import { Badge, Empty, LinkButton, PageHeader, statusTone } from "@/components/ui";
import { ProductCover } from "@/components/product-cover";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default async function Products() {
  const user = await requireUserPage("/app/products");
  const items = await listProducts(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="Your product line"
        description="Every product starts as a brief. The writer turns it into finished pages you can export as a PDF."
        actions={
          <LinkButton href="/app/products/new">
            <Plus className="size-4" aria-hidden /> New product
          </LinkButton>
        }
      />
      {items.length === 0 ? (
        <Empty title="Nothing on the shelf yet" body="Start from an idea in the lab, or write your own brief." action={<LinkButton href="/app/ideas">Go to the idea lab</LinkButton>} />
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/app/products/${p.id}`} className="group block">
                <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} className="transition-transform duration-200 group-hover:-translate-y-1" />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
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
