import { adminStats } from "@/server/admin";
import { Card, PageHeader } from "@/components/ui";
import { AddStarter, RunAutopilot } from "@/components/admin";
import { STARTER } from "@/server/starter";
import { money } from "@/lib/format";
import { getT } from "@/lib/i18n-server";

export default async function AdminHome() {
  const t = await getT();
  const s = await adminStats();
  const stats: [string, string | number][] = [
    [t("Store revenue"), money(s.revenueCents)],
    [t("Orders"), s.orders],
    [t("Users"), s.users],
    [t("Paying subscribers"), s.paying],
    [t("Products"), s.products],
    [t("Published in store"), s.published],
    [t("Active campaigns"), s.activeCampaigns],
    [t("Posts scheduled"), s.postsScheduled],
  ];
  return (
    <>
      <PageHeader eyebrow={t("Control panel")} title={t("Platform overview")} description={t("Everything across the store and every creator workspace.")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-2 font-display text-4xl tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">{t("Starter product")}</h2>
        <p className="mb-4 mt-1 max-w-2xl text-sm text-muted">
          {t(
            "“{title}” is a finished 10-page planner that ships with the platform, picked for the new-year planning season. Add it to your shelf, review it, set the price and publish it to the store. It does not use AI credits.",
            { title: STARTER.title },
          )}
        </p>
        <AddStarter />
      </Card>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">{t("Autopilot")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("Runs automatically every day at 08:00 UTC. You can also trigger it by hand.")}</p>
        <RunAutopilot />
      </Card>
    </>
  );
}
