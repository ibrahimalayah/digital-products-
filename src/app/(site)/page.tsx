import { ArrowRight, CalendarClock, FileText, Lightbulb, Megaphone, PenLine, Send, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { money } from "@/lib/format";

const steps = [
  { icon: Lightbulb, title: "Find an idea worth building", body: "Type a niche. The idea scout returns specific products with a promise, a buyer and what goes inside, plus the searches to check before you commit." },
  { icon: FileText, title: "Generate the whole product", body: "The writer plans an outline, then fills every page: steps, checklists, templates and trackers. Export a print-ready PDF in Letter or A4." },
  { icon: Megaphone, title: "Run ads on your budget", body: "Set a monthly budget from $0 up. The planner splits it by channel, the poster writes fresh posts every day, and Postiz publishes them." },
];

const agents = [
  { icon: Sparkles, name: "Idea scout", does: "Turns a niche into six sellable product ideas." },
  { icon: PenLine, name: "Product writer", does: "Writes every page in full. No placeholders." },
  { icon: Megaphone, name: "Ad planner", does: "Splits your budget across channels and picks angles." },
  { icon: CalendarClock, name: "Daily poster", does: "Writes today's posts for each live campaign." },
  { icon: Send, name: "Publisher", does: "Schedules approved posts to your social accounts." },
];

function PageMock() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md" aria-hidden>
      <div className="absolute left-2 top-10 h-[340px] w-[250px] -rotate-6 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex h-[46%] items-end bg-accent p-5">
          <p className="font-display text-[26px] leading-[1.05] text-on-accent">Medical Bill Fight-Back Kit</p>
        </div>
        <div className="space-y-2 p-5">
          <p className="text-[11px] leading-snug text-muted">Cut or freeze a bill before it reaches collections.</p>
          <div className="mt-12 h-1.5 w-16 rounded bg-line" />
        </div>
      </div>
      <div className="absolute right-0 top-0 h-[360px] w-[265px] rotate-3 rounded-xl border border-line bg-surface p-5 shadow-card">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-accent">Dispute · 2 of 3</p>
        <p className="mt-1.5 font-display text-xl leading-tight">Request an itemized bill</p>
        <p className="mt-1 text-[10px] text-muted">Goal: get every charge in writing.</p>
        <div className="mt-4 space-y-2.5">
          {["Call the billing office", "Ask for the itemized statement", "Note the reference number"].map((t, i) => (
            <div key={t} className="flex gap-2 text-[11px]">
              <span className="font-semibold text-accent">{i + 1}.</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border-l-2 border-accent bg-sunken px-3 py-2">
          <p className="text-[8px] font-semibold uppercase tracking-widest text-accent">Pro tip</p>
          <p className="mt-0.5 text-[10px] leading-snug">Ask them to pause the account while you review.</p>
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="size-3 rounded-[3px] border border-ink" />
              <span className="h-1.5 flex-1 rounded bg-line" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-10 w-[270px] rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Today · LinkedIn</p>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">Scheduled</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug">A surprise ER bill is negotiable. Most people never ask for the itemized statement. Here is the script.</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="grain border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="rise">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">AI studio for digital products</p>
            <h1 className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.95] tracking-tight">
              From one idea to a product that <em className="text-accent">sells itself</em> daily.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Kitforge researches what to make, writes the full printable product, and promotes it every day on the budget you set. You approve; the agents do the rest.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton href="/sign-up" size="lg">
                Start free <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/store" variant="secondary" size="lg">
                Browse the store
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted">Free plan includes a full product. No card needed.</p>
          </div>
          <PageMock />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">Three steps, one afternoon.</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-surface p-7">
              <div className="flex items-center justify-between">
                <s.icon className="size-6 text-accent" aria-hidden />
                <span className="font-display text-4xl text-line">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">Five agents on your team.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Each one has a single job and reports back in your activity log. Turn on autopilot and the last two run every morning without you.
            </p>
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {agents.map((a) => (
              <li key={a.name} className="flex items-center gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <a.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted">{a.does}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">A plan for every budget.</h2>
          <LinkButton href="/pricing" variant="ghost">
            Compare plans <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            return (
              <div key={id} className="rounded-2xl border border-line bg-surface p-6">
                <p className="text-sm font-medium text-muted">{p.name}</p>
                <p className="mt-2 font-display text-5xl">
                  {money(p.priceCents)}
                  <span className="font-sans text-sm text-muted"> /mo</span>
                </p>
                <p className="mt-3 text-sm text-muted">Plan campaigns up to {money(p.limits.monthlyAdBudgetCents)} a month.</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
