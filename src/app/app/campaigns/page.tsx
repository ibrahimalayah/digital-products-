import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { listCampaigns } from "@/server/campaigns";
import { Badge, Card, Empty, LinkButton, PageHeader, statusTone } from "@/components/ui";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Campaigns" };

export default async function Campaigns() {
  const user = await requireUserPage("/app/campaigns");
  const rows = await listCampaigns(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Campaigns"
        title="Ads and daily posts"
        description="Each campaign has a monthly budget, a channel mix and a posting rhythm."
        actions={
          <LinkButton href="/app/campaigns/new">
            <Plus className="size-4" aria-hidden /> New campaign
          </LinkButton>
        }
      />
      {rows.length === 0 ? (
        <Empty title="No campaigns running" body="Create one to get a budget plan and your first day of posts." action={<LinkButton href="/app/campaigns/new">Plan a campaign</LinkButton>} />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ campaign: c, productTitle }) => (
            <li key={c.id}>
              <Link href={`/app/campaigns/${c.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-ink">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-sm text-muted">{productTitle}</p>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="text-muted">
                      {c.postsPerDay}/day · {c.channels.length} channel{c.channels.length === 1 ? "" : "s"}
                    </span>
                    <span className="font-mono">{money(c.monthlyBudgetCents)}/mo</span>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
