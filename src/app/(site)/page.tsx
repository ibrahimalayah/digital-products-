import Image from "next/image";
import { ArrowRight, CalendarClock, Check, FileText, Lightbulb, Megaphone, PenLine, Printer, Send, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { BRAND } from "@/lib/brand.generated";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

const kinds = ["Template packs", "Planners", "Workbooks", "Checklists", "Letter kits", "Call scripts", "Trackers", "Swipe files", "Budget sheets", "Meal plans", "Study guides", "Launch kits"];

const agents = [
  { icon: Sparkles, name: "Idea scout", does: "Turns a niche into six sellable product ideas." },
  { icon: PenLine, name: "Product writer", does: "Writes every page in full. No placeholders." },
  { icon: Megaphone, name: "Ad planner", does: "Splits your budget across channels and picks angles." },
  { icon: CalendarClock, name: "Daily poster", does: "Writes today's posts for each live campaign." },
  { icon: Send, name: "Publisher", does: "Schedules approved posts to your social accounts." },
];

const faqs = [
  { q: "What kind of products can I make?", a: "Printable PDFs: kits, template packs, planners, workbooks, checklists and trackers. The writer produces steps, tick-box lists, fill-in pages, ready-to-copy templates and tips, laid out for US Letter or A4." },
  { q: "Do I own what I generate?", a: "Yes. Download the PDF and sell it anywhere you like: your own site, Etsy, Gumroad or by email. Read and edit every product before you sell it; you are responsible for what it says." },
  { q: "How do the ad budgets work?", a: "You set a monthly budget per campaign. The ad planner splits it across your channels and the daily poster keeps them fed with organic posts. Paid spend itself is set up in each network's ads manager and billed by that network." },
  { q: "Which social networks can it post to?", a: "Publishing runs through Buffer, which is free for up to three channels and covers X, LinkedIn, Facebook, Threads, Bluesky, Mastodon and Google Business. Postiz is supported too. Without either you can still copy every post by hand." },
  { q: "Can I cancel?", a: "Any time, from the billing page. You keep your products and drop back to the free plan's limits." },
];

function FloatingCards() {
  return (
    <>
      <div className="float absolute -left-3 -bottom-6 w-[230px] rounded-2xl border border-line bg-surface p-4 shadow-lift sm:-left-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Today · LinkedIn</p>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">Scheduled</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug">A surprise ER bill is negotiable. Most people never ask for the itemized statement. Here is the script.</p>
      </div>
      <div className="float absolute -right-2 -top-6 w-[190px] rounded-2xl border border-line bg-surface p-4 shadow-lift [animation-delay:-3s] sm:-right-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Budget plan</p>
        <p className="mt-1 font-display text-3xl leading-none">$250</p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-sunken">
          <span className="w-[55%] bg-accent" />
          <span className="w-[30%] bg-accent/60" />
          <span className="w-[15%] bg-accent/30" />
        </div>
        <p className="mt-2 text-[10px] text-muted">Pinterest 55 · Instagram 30 · X 15</p>
      </div>
    </>
  );
}

function PageArt() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-line bg-sunken" aria-hidden>
      <div className="grain absolute inset-0 opacity-70" />
      <div className="absolute left-[10%] top-[14%] h-[72%] w-[38%] -rotate-6 overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
        <div className="flex h-[46%] items-end bg-accent p-4">
          <p className="font-display text-xl leading-[1.05] text-on-accent">Medical Bill Fight-Back Kit</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] leading-snug text-muted">Cut or freeze a bill before it reaches collections.</p>
        </div>
      </div>
      <div className="absolute right-[10%] top-[8%] h-[80%] w-[42%] rotate-3 rounded-xl border border-line bg-surface p-4 shadow-lift">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-accent">Dispute · 2 of 3</p>
        <p className="mt-1 font-display text-lg leading-tight">Request an itemized bill</p>
        <div className="mt-3 space-y-2">
          {["Call the billing office", "Ask for the itemized statement", "Note the reference number"].map((t, i) => (
            <div key={t} className="flex gap-2 text-[10px]">
              <span className="font-semibold text-accent">{i + 1}.</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border-l-2 border-accent bg-sunken px-2.5 py-1.5">
          <p className="text-[7px] font-semibold uppercase tracking-widest text-accent">Pro tip</p>
          <p className="mt-0.5 text-[9px] leading-snug">Ask them to pause the account while you review.</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] border border-ink" />
              <span className="h-1 flex-1 rounded bg-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bento({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("reveal lift overflow-hidden rounded-3xl border border-line bg-surface p-7", className)}>{children}</div>;
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grain absolute inset-0 opacity-60" aria-hidden />
        <div className="absolute -right-40 -top-40 size-[520px] rounded-full bg-accent-soft blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="rise">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-accent" /> AI studio for digital products
            </p>
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
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["A full product on the free plan", "No card needed", "Letter and A4"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rise relative [animation-delay:120ms]">
            {BRAND.hero ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-line shadow-lift">
                <Image src={BRAND.hero} alt="Printed planner pages with a green cover band on a desk" fill priority sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
              </div>
            ) : (
              <PageArt />
            )}
            <FloatingCards />
          </div>
        </div>
      </section>

      {/* What you can make */}
      <section className="border-b border-line bg-surface py-5" aria-label="Product types">
        <div className="marquee-mask overflow-hidden">
          <ul className="marquee flex w-max gap-3">
            {[...kinds, ...kinds].map((k, i) => (
              <li key={i} aria-hidden={i >= kinds.length} className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm text-muted">
                {k}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bento */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">How it works</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">Three steps, one afternoon.</h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          <Bento className="lg:col-span-3">
            <div className="flex items-center justify-between">
              <Lightbulb className="size-6 text-accent" aria-hidden />
              <span className="font-display text-5xl text-line">01</span>
            </div>
            <h3 className="mt-6 text-xl font-semibold">Find an idea worth building</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">Type a niche. The idea scout returns specific products with a promise, a buyer and what goes inside, plus the searches to check before you commit.</p>
            <div className="mt-6 space-y-2">
              {[
                ["Credit Card Hardship Letter Pack", "$12"],
                ["Medical Bill Fight-Back Kit", "$15"],
              ].map(([t, p]) => (
                <div key={t} className="flex items-center justify-between rounded-xl border border-line bg-bg px-4 py-3 text-sm">
                  <span>{t}</span>
                  <span className="font-mono text-muted">{p}</span>
                </div>
              ))}
            </div>
          </Bento>
          <Bento className="lg:col-span-3">
            <div className="flex items-center justify-between">
              <FileText className="size-6 text-accent" aria-hidden />
              <span className="font-display text-5xl text-line">02</span>
            </div>
            <h3 className="mt-6 text-xl font-semibold">Generate the whole product</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">The writer plans an outline, then fills every page: steps, checklists, templates and trackers. Export a print-ready PDF.</p>
            <div className="mt-6 rounded-xl border border-line bg-bg p-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Writing section 3 of 4</span>
                <span className="font-mono">75%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full w-3/4 rounded-full bg-accent" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[1, 1, 1, 0].map((done, i) => (
                  <div key={i} className={cn("aspect-[3/4] rounded-md border", done ? "border-accent/40 bg-accent-soft" : "border-dashed border-line")} />
                ))}
              </div>
            </div>
          </Bento>
          <Bento className="bg-ink text-bg lg:col-span-4">
            <div className="flex items-center justify-between">
              <Megaphone className="size-6" aria-hidden />
              <span className="font-display text-5xl opacity-25">03</span>
            </div>
            <h3 className="mt-6 text-xl font-semibold">Run ads on your budget</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed opacity-70">Set a monthly budget from $0 up. The planner splits it by channel, the poster writes fresh posts every day, and Buffer publishes them.</p>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {["$0", "$50", "$250", "$1k", "$5k"].map((b, i) => (
                <div key={b} className={cn("rounded-xl border px-2 py-3 text-center", i === 2 ? "border-bg bg-bg text-ink" : "border-bg/20")}>
                  <p className="font-display text-2xl leading-none">{b}</p>
                </div>
              ))}
            </div>
          </Bento>
          <Bento className="lg:col-span-2">
            <Printer className="size-6 text-accent" aria-hidden />
            <h3 className="mt-6 text-xl font-semibold">Print-ready by default</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Cover, welcome page, contents, numbered pages and back-of-book extras, in US Letter or A4.</p>
          </Bento>
          <Bento className="lg:col-span-2">
            <Wallet className="size-6 text-accent" aria-hidden />
            <h3 className="mt-6 text-xl font-semibold">Sell it your way</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Download the PDF and list it anywhere. Buyers in the Kitforge store pay through Stripe and download instantly.</p>
          </Bento>
          <Bento className="lg:col-span-2">
            <CalendarClock className="size-6 text-accent" aria-hidden />
            <h3 className="mt-6 text-xl font-semibold">Autopilot every morning</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Switch it on and each active campaign gets fresh posts at 08:00 UTC, ready for your approval.</p>
          </Bento>
          <Bento className="lg:col-span-2">
            <ShieldCheck className="size-6 text-accent" aria-hidden />
            <h3 className="mt-6 text-xl font-semibold">You stay in control</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Nothing is published until you approve it. Your connected keys are encrypted and never shown again.</p>
          </Bento>
        </div>
      </section>

      {/* Agents */}
      <section className="border-y border-line bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="reveal lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">The team</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">Five agents, one job each.</h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted">Every agent reports back in your activity log. Turn on autopilot and the last two run every morning without you.</p>
          </div>
          <ol className="space-y-3">
            {agents.map((a, i) => (
              <li key={a.name} className="reveal lift flex items-center gap-5 rounded-2xl border border-line bg-surface p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <a.icon className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted">{a.does}</p>
                </div>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Pricing</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">A plan for every budget.</h2>
          </div>
          <LinkButton href="/pricing" variant="ghost">
            Compare plans <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const featured = id === "pro";
            return (
              <div key={id} className={cn("reveal lift rounded-3xl border p-7", featured ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium opacity-70">{p.name}</p>
                  {featured ? <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">Popular</span> : null}
                </div>
                <p className="mt-3 font-display text-6xl leading-none">
                  {money(p.priceCents)}
                  <span className="font-sans text-sm opacity-60"> /mo</span>
                </p>
                <p className="mt-4 text-sm opacity-70">Plan campaigns up to {money(p.limits.monthlyAdBudgetCents)} a month.</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.5fr]">
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">Questions, answered.</h2>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-accent px-6 py-16 text-center text-on-accent sm:py-20">
          <div className="grain absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-[1.02] tracking-tight sm:text-6xl">Your first product is one afternoon away.</h2>
            <p className="mx-auto mt-4 max-w-md opacity-80">Start on the free plan. Upgrade when you want bigger budgets and the daily autopilot.</p>
            <LinkButton href="/sign-up" size="lg" className="mt-8 bg-on-accent text-accent hover:bg-ink hover:text-bg">
              Create your studio <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
