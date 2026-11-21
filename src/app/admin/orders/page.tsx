import type { Metadata } from "next";
import { adminOrders } from "@/server/admin";
import { Badge, Empty, PageHeader, statusTone } from "@/components/ui";
import { dateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrders() {
  const orders = await adminOrders();
  return (
    <>
      <PageHeader eyebrow="Control panel" title="Orders" description="Store purchases confirmed by Stripe. Refunds are issued in the Stripe dashboard and reflected here." />
      {orders.length === 0 ? (
        <Empty title="No orders yet" body="Sales appear here as soon as Stripe confirms payment." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-muted">{dateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{o.product}</td>
                  <td className="px-4 py-3">{o.buyer}</td>
                  <td className="px-4 py-3 font-mono">{money(o.amountCents)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
