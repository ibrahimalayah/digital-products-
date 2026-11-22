import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { listChannels, PUBLISHERS } from "@/lib/publishers";
import { listProducts } from "@/server/products";
import { getPublisher } from "@/server/settings";
import { GENERIC_CHANNELS } from "@/server/campaigns";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/studio/campaign-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("New campaign") };
}

const label = (id: string) => (id === "x" ? "X" : id.charAt(0).toUpperCase() + id.slice(1));

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUserPage("/app/campaigns/new");
  const { product } = await searchParams;
  const plan = getPlan(user.plan);
  const [t, products, auth, [{ used }]] = await Promise.all([
    getT(),
    listProducts(user.id),
    getPublisher(user.id),
    db
      .select({ used: sql<number>`coalesce(sum(${schema.campaigns.monthlyBudgetCents}),0)::int` })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.userId, user.id)),
  ]);
  let channels = GENERIC_CHANNELS.map((identifier) => ({ integrationId: null as string | null, identifier, name: label(identifier) }));
  let connected = false;
  if (auth) {
    try {
      const live = (await listChannels(auth)).filter((c) => !c.disabled);
      if (live.length) {
        channels = live.map((c) => ({ integrationId: c.id, identifier: c.identifier, name: c.name }));
        connected = true;
      }
    } catch {
      // Fall back to copy-and-paste channels when the publishing service is unreachable.
    }
  }
  return (
    <>
      <PageHeader eyebrow={t("Campaigns")} title={t("Plan a campaign")} description={t("Pick a product and a budget. The ad planner allocates it, and the daily poster keeps your channels fed.")} />
      {products.length === 0 ? (
        <Empty title={t("You need a product first")} body={t("Campaigns promote a product from your line.")} action={<LinkButton href="/app/products/new">{t("Create a product")}</LinkButton>} />
      ) : (
        <CampaignForm
          products={products.map((p) => ({ id: p.id, title: p.title }))}
          defaultProduct={products.some((p) => p.id === product) ? product : undefined}
          channels={channels}
          connected={connected}
          publisherName={auth ? PUBLISHERS[auth.kind].name : "Buffer"}
          limits={{ plan: t(plan.name), budgetLeftCents: Math.max(0, plan.limits.monthlyAdBudgetCents - used), postsPerDay: plan.limits.postsPerDay }}
        />
      )}
    </>
  );
}
