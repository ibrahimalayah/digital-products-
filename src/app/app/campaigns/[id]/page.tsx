import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { listPosts } from "@/server/campaigns";
import { publicSettings } from "@/server/settings";
import { PageHeader } from "@/components/ui";
import { CampaignBoard } from "@/components/studio/campaign-board";

export const metadata: Metadata = { title: "Campaign" };

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/app/campaigns/${id}`);
  const [row] = await db
    .select({ c: schema.campaigns, productTitle: schema.products.title, productId: schema.products.id })
    .from(schema.campaigns)
    .innerJoin(schema.products, eq(schema.campaigns.productId, schema.products.id))
    .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, user.id)))
    .limit(1);
  if (!row) notFound();
  const [posts, settings] = await Promise.all([listPosts(user.id, id), publicSettings(user.id)]);
  const c = row.c;
  return (
    <>
      <Link href="/app/campaigns" className="mb-6 inline-block text-sm text-muted hover:text-ink">
        ← Campaigns
      </Link>
      <PageHeader eyebrow={`Campaign for ${row.productTitle}`} title={c.name} />
      <CampaignBoard
        postizConnected={settings.postizConnected}
        campaign={{ id: c.id, name: c.name, status: c.status, objective: c.objective, monthlyBudgetCents: c.monthlyBudgetCents, postsPerDay: c.postsPerDay, plan: c.plan }}
        initialPosts={posts.map((p) => ({
          id: p.id,
          channel: p.channel,
          integrationId: p.integrationId,
          angle: p.angle,
          content: p.content,
          scheduledAt: p.scheduledAt.toISOString(),
          status: p.status,
          error: p.error,
        }))}
      />
    </>
  );
}
