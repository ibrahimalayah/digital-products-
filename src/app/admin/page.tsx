import { adminStats } from "@/server/admin";
import { Card, PageHeader } from "@/components/ui";
import { RunAutopilot } from "@/components/admin";
import { money } from "@/lib/format";

export default async function AdminHome() {
  const s = await adminStats();
  const stats: [string, string | number][] = [
    ["Store revenue", money(s.revenueCents)],
    ["Orders", s.orders],
    ["Users", s.users],
    ["Paying subscribers", s.paying],
    ["Products", s.products],
    ["Published in store", s.published],
    ["Active campaigns", s.activeCampaigns],
    ["Posts scheduled", s.postsScheduled],
  ];
  return (
    <>
      <PageHeader eyebrow="Control panel" title="Platform overview" description="Everything across the store and every creator workspace." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-2 font-display text-4xl tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">Autopilot</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Runs automatically every day at 08:00 UTC. You can also trigger it by hand.</p>
        <RunAutopilot />
      </Card>
    </>
  );
}
