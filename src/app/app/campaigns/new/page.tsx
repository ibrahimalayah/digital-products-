import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { listChannels } from "@/lib/postiz";
import { listProducts } from "@/server/products";
import { getPostizKey } from "@/server/settings";
import { GENERIC_CHANNELS } from "@/server/campaigns";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/studio/campaign-form";

export const metadata: Metadata = { title: "New campaign" };

const label = (id: string) => (id === "x" ? "X" : id.charAt(0).toUpperCase() + id.slice(1));

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUserPage("/app/campaigns/new");
  const { product } = await searchParams;
  const plan = getPlan(user.plan);
  const [products, key, [{ used }]] = await Promise.all([
    listProducts(user.id),
    getPostizKey(user.id),
    db
      .select({ used: sql<number>`coalesce(sum(${schema.campaigns.monthlyBudgetCents}),0)::int` })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.userId, user.id)),
  ]);
  let channels = GENERIC_CHANNELS.map((identifier) => ({ integrationId: null as string | null, identifier, name: label(identifier) }));
  let connected = false;
  if (key) {
    try {
      const live = (await listChannels(key)).filter((c) => !c.disabled);
      if (live.length) {
        channels = live.map((c) => ({ integrationId: c.id, identifier: c.identifier, name: c.name }));
        connected = true;
      }
    } catch {
      // Fall back to copy-and-paste channels when Postiz is unreachable.
    }
  }
  return (
    <>
      <PageHeader eyebrow="Campaigns" title="Plan a campaign" description="Pick a product and a budget. The ad planner allocates it, and the daily poster keeps your channels fed." />
      {products.length === 0 ? (
        <Empty title="You need a product first" body="Campaigns promote a product from your line." action={<LinkButton href="/app/products/new">Create a product</LinkButton>} />
      ) : (
        <CampaignForm
          products={products.map((p) => ({ id: p.id, title: p.title }))}
          defaultProduct={products.some((p) => p.id === product) ? product : undefined}
          channels={channels}
          connected={connected}
          limits={{ plan: plan.name, budgetLeftCents: Math.max(0, plan.limits.monthlyAdBudgetCents - used), postsPerDay: plan.limits.postsPerDay }}
        />
      )}
    </>
  );
}
