import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, CalendarCheck, Check, FileText, Lightbulb, Megaphone, Wallet } from "lucide-react";
import { db, schema } from "@/db";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { listRuns } from "@/server/agents-log";
import { publicSettings } from "@/server/settings";
import { cn } from "@/lib/cn";
import { Badge, Card, LinkButton, Meter, PageHeader, statusTone } from "@/components/ui";
import { dateTime, money } from "@/lib/format";

export default async function Overview() {
  const user = await requireUserPage();
  const plan = getPlan(user.plan);
  const one = (q: Promise<{ n: number }[]>) => q.then((r) => r[0].n);
  const n = sql<number>`count(*)::int`;
  const [usage, products, campaigns, scheduled, budget, runs, ideas, settings] = await Promise.all([
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
    one(db.select({ n }).from(schema.ideas).where(eq(schema.ideas.userId, user.id))),
    publicSettings(user.id),
  ]);

  const next = [
    { href: "/app/ideas", icon: Lightbulb, title: "Research ideas", body: "Give the scout a niche and pick a winner." },
    { href: "/app/products", icon: FileText, title: "Build a product", body: "Generate every page and export the PDF." },
    { href: "/app/campaigns", icon: Megaphone, title: "Launch a campaign", body: "Set a budget and let the agents post daily." },
  ];
  const stats = [
    { label: "Products", value: products, icon: FileText },
    { label: "Campaigns", value: campaigns, icon: Megaphone },
    { label: "Posts scheduled", value: scheduled, icon: CalendarCheck },
    { label: "Planned budget", value: money(budget), icon: Wallet },
  ];
  const steps = [
    { done: ideas > 0, label: "Research your first idea", href: "/app/ideas" },
    { done: products > 0, label: "Create a product", href: ideas > 0 ? "/app/ideas" : "/app/products/new" },
    { done: campaigns > 0, label: "Plan a campaign", href: "/app/campaigns/new" },
    { done: settings.publisherConnected, label: "Connect Buffer to publish", href: "/app/settings" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader eyebrow="Overview" title={`Hello, ${user.name.split(" ")[0]}.`} description="Here is where your studio stands this month." />
      {doneCount < steps.length ? (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <div>
              <h2 className="font-display text-2xl">Getting started</h2>
              <p className="text-sm text-muted">
                {doneCount} of {steps.length} done
              </p>
            </div>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Setup progress" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.label} className="border-line max-lg:border-b lg:border-r lg:last:border-r-0">
                <Link href={st.href} className="flex h-full items-center gap-3 px-6 py-4 text-sm transition-colors hover:bg-sunken">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs", st.done ? "bg-accent text-on-accent" : "border border-line text-muted")}>
                    {st.done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className={st.done ? "text-muted line-through" : "font-medium"}>{st.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label} className="lift p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted">{st.label}</p>
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
                <st.icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="mt-3 font-display text-4xl tabular-nums">{st.value}</p>
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
            <Meter label="Lead videos this month" used={usage.videos} limit={plan.limits.videosPerMonth} />
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
          <Link key={item.href} href={item.href} className="group lift rounded-2xl border border-line bg-surface p-5 hover:border-ink">
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
