import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { listCampaigns } from "@/server/campaigns";
import { Badge, Card, Empty, LinkButton, PageHeader, statusTone } from "@/components/ui";
import { money } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Campaigns") };
}

// Display names for campaign status ids; the ids themselves stay as stored.
const STATUS: Record<string, string> = { draft: msg("draft"), active: msg("active"), paused: msg("paused") };

export default async function Campaigns() {
  const user = await requireUserPage("/app/campaigns");
  const [rows, t] = await Promise.all([listCampaigns(user.id), getT()]);
  return (
    <>
      <PageHeader
        eyebrow={t("Campaigns")}
        title={t("Ads and daily posts")}
        description={t("Each campaign has a monthly budget, a channel mix and a posting rhythm.")}
        actions={
          <LinkButton href="/app/campaigns/new">
            <Plus className="size-4" aria-hidden /> {t("New campaign")}
          </LinkButton>
        }
      />
      {rows.length === 0 ? (
        <Empty title={t("No campaigns running")} body={t("Create one to get a budget plan and your first day of posts.")} action={<LinkButton href="/app/campaigns/new">{t("Plan a campaign")}</LinkButton>} />
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
                      {t(c.channels.length === 1 ? "{posts}/day · {n} channel" : "{posts}/day · {n} channels", { posts: c.postsPerDay, n: c.channels.length })}
                    </span>
                    <span className="font-mono">{t("{amount}/mo", { amount: money(c.monthlyBudgetCents) })}</span>
                    <Badge tone={statusTone(c.status)}>{t(STATUS[c.status] ?? c.status)}</Badge>
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
