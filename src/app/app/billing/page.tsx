import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { integrations } from "@/lib/env";
import { getI18n, getT } from "@/lib/i18n-server";
import { Notice, PageHeader } from "@/components/ui";
import { BillingPanel } from "@/components/studio/billing-panel";
import { shortDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Billing") };
}

export default async function Billing({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const user = await requireUserPage("/app/billing");
  const { upgraded } = await searchParams;
  const { t, lang } = await getI18n();
  return (
    <>
      <PageHeader
        eyebrow={t("Billing")}
        title={t("Plan and billing")}
        description={user.planRenewsAt ? t("Your plan renews on {date}.", { date: shortDate(user.planRenewsAt, lang) }) : t("Upgrade when you need more products, bigger budgets or the daily autopilot.")}
      />
      {upgraded ? (
        <div className="mb-6">
          <Notice tone="accent">{t("Payment received. Your new plan activates within a few seconds; refresh if it still shows the old one.")}</Notice>
        </div>
      ) : null}
      <BillingPanel current={user.plan} hasBilling={Boolean(user.stripeCustomerId)} stripeReady={integrations.stripe()} />
    </>
  );
}
