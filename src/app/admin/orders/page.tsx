import type { Metadata } from "next";
import { adminOrders } from "@/server/admin";
import { Badge, Empty, PageHeader, statusTone } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";

// Order statuses as stored; shown through t().
const STATUS: Record<string, string> = { paid: msg("paid"), refunded: msg("refunded"), disputed: msg("disputed") };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Orders") };
}

export default async function AdminOrders() {
  const t = await getT();
  const orders = await adminOrders();
  return (
    <>
      <PageHeader eyebrow={t("Control panel")} title={t("Orders")} description={t("Store purchases confirmed by Stripe. Refunds are issued in the Stripe dashboard and reflected here.")} />
      {orders.length === 0 ? (
        <Empty title={t("No orders yet")} body={t("Sales appear here as soon as Stripe confirms payment.")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("When")}</th>
                <th className="px-4 py-3 font-medium">{t("Product")}</th>
                <th className="px-4 py-3 font-medium">{t("Buyer")}</th>
                <th className="px-4 py-3 font-medium">{t("Amount")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
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
                    <Badge tone={statusTone(o.status)}>{t(STATUS[o.status] ?? o.status)}</Badge>
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
