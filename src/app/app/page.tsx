import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, FileText, Lightbulb, Megaphone } from "lucide-react";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { listRuns } from "@/server/agents-log";
import { Badge, Card, LinkButton, Meter, PageHeader, statusTone } from "@/components/ui";
import { dateTime, money } from "@/lib/format";

export default async function Overview() {
  const user = await requireUserPage();
  const plan = getPlan(user.plan);
  const one = (q: Promise<{ n: number }[]>) => q.then((r) => r[0].n);
  const n = sql<number>`count(*)::int`;
  const [usage, products, campaigns, scheduled, budget, runs] = await Promise.all([
    getUsage(user.id),
    one(db.select({ n }).from(schema.products).where(eq(schema.products.userId, user.id))),
    one(db.select({ n }).from(schema.campaigns).where(eq(schema.campaigns.userId, user.id))),
    one(db.select({ n }).from(schema.posts).where(sql`${schema.posts.userId} = ${user.id} and ${schema.posts.status} = 'scheduled'`)),
    one(
      db
        .select({ n: sql<number>`coalesce(sum(${schema.campaigns.monthlyBudgetCents}),0)::int` })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.userId, user.id)),
    ),
    listRuns(user.id, 6),
  ]);

  const next = [
    { href: "/app/ideas", icon: Lightbulb, title: "Research ideas", body: "Give the scout a niche and pick a winner." },
    { href: "/app/products", icon: FileText, title: "Build a product", body: "Generate every page and export the PDF." },
    { href: "/app/campaigns", icon: Megaphone, title: "Launch a campaign", body: "Set a budget and let the agents post daily." },
  ];
  const stats: [string, string | number][] = [
    ["Products", products],
    ["Campaigns", campaigns],
    ["Posts scheduled", scheduled],
    ["Planned budget", money(budget)],
  ];

  return (
    <>
      <PageHeader eyebrow="Overview" title={`Hello, ${user.name.split(" ")[0]}.`} description="Here is where your studio stands this month." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-2 font-display text-4xl tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{plan.name} plan</h2>
            <LinkButton href="/app/billing" variant="secondary" size="sm">
              {plan.id === "business" ? "Manage" : "Upgrade"}
            </LinkButton>
          </div>
          <div className="mt-5 space-y-4">
            <Meter label="Idea research runs this month" used={usage.ideas} limit={plan.limits.ideasPerMonth} />
            <Meter label="Products generated this month" used={usage.products} limit={plan.limits.productsPerMonth} />
            <Meter label="Campaigns" used={campaigns} limit={plan.limits.campaigns} />
            <Meter label="Planned ad budget ($)" used={Math.round(budget / 100)} limit={plan.limits.monthlyAdBudgetCents / 100} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Agent activity</h2>
            <Link href="/app/agents" className="text-sm text-muted hover:text-ink">
              View all
            </Link>
          </div>
          {runs.length === 0 ? (
            <p className="mt-5 text-sm text-muted">Nothing yet. Your agents report here as they work.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={statusTone(r.status)}>{r.agent.replace("-", " ")}</Badge>
                    <time className="text-xs text-muted">{dateTime(r.createdAt)}</time>
                  </div>
                  <p className="mt-1.5 text-sm">{r.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {next.map((item) => (
          <Link key={item.href} href={item.href} className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink">
            <item.icon className="size-5 text-accent" aria-hidden />
            <p className="mt-4 flex items-center gap-1.5 font-medium">
              {item.title} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </p>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
