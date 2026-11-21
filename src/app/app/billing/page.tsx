import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { integrations } from "@/lib/env";
import { Notice, PageHeader } from "@/components/ui";
import { BillingPanel } from "@/components/studio/billing-panel";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Billing" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const user = await requireUserPage("/app/billing");
  const { upgraded } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Plan and billing"
        description={user.planRenewsAt ? `Your plan renews on ${shortDate(user.planRenewsAt)}.` : "Upgrade when you need more products, bigger budgets or the daily autopilot."}
      />
      {upgraded ? (
        <div className="mb-6">
          <Notice tone="accent">Payment received. Your new plan activates within a few seconds; refresh if it still shows the old one.</Notice>
        </div>
      ) : null}
      <BillingPanel current={user.plan} hasBilling={Boolean(user.stripeCustomerId)} stripeReady={integrations.stripe()} />
    </>
  );
}
