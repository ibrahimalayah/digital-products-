import type { Metadata } from "next";
import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Pricing" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Pricing</p>
        <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">Pay for the pace you ship at.</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">Every plan includes the idea scout, the product writer and PDF export. Paid plans add bigger campaign budgets and the daily autopilot.</p>
      </div>
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const featured = id === "pro";
          return (
            <section key={id} className={cn("flex flex-col rounded-3xl border p-7", featured ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>
              <h2 className="text-sm font-medium opacity-70">{p.name}</h2>
              <p className="mt-3 font-display text-6xl leading-none">
                {money(p.priceCents)}
                <span className="font-sans text-sm opacity-60"> /month</span>
              </p>
              <p className="mt-3 text-sm opacity-70">{p.tagline}</p>
              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-bg" : "text-accent")} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton
                href={id === "free" ? "/sign-up" : `/sign-up?next=${encodeURIComponent("/app/billing")}`}
                variant={featured ? "secondary" : "primary"}
                className="mt-8 w-full"
              >
                {id === "free" ? "Start free" : `Choose ${p.name}`}
              </LinkButton>
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-muted">Budgets are planning limits. Paid ad spend is charged by each ad network, not by Kitforge. Cancel any time from the billing page.</p>
    </div>
  );
}
