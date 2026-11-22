"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button, Notice } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useT } from "@/components/i18n";

export function BillingPanel({ current, hasBilling, stripeReady }: { current: string; hasBilling: boolean; stripeReady: boolean }) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(name: string, path: string, body: unknown) {
    setBusy(name);
    setError(null);
    try {
      const { url } = await api<{ url: string }>(path, { body });
      window.location.assign(url);
    } catch (e) {
      setError(t(errorMessage(e)));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {!stripeReady ? <Notice tone="gold">{t("Payments are not connected on this deployment yet, so upgrades are unavailable.")}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = current === id;
          return (
            <section key={id} className={cn("flex flex-col rounded-3xl border p-6", isCurrent ? "border-accent bg-accent-soft/40" : "border-line bg-surface")}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted">{t(p.name)}</h2>
                {isCurrent ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-on-accent">{t("Current")}</span> : null}
              </div>
              <p className="mt-3 font-display text-5xl leading-none">
                {money(p.priceCents)}
                <span className="font-sans text-sm text-muted"> {t("/month")}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    {t(f)}
                  </li>
                ))}
              </ul>
              {id !== "free" && !isCurrent ? (
                <Button className="mt-6 w-full" disabled={!stripeReady} loading={busy === id} onClick={() => go(id, "/api/checkout", { kind: "plan", plan: id })}>
                  {t(current === "free" ? "Upgrade to {plan}" : "Switch to {plan}", { plan: t(p.name) })}
                </Button>
              ) : null}
            </section>
          );
        })}
      </div>
      {hasBilling ? (
        <Button variant="secondary" loading={busy === "portal"} onClick={() => go("portal", "/api/billing/portal", {})}>
          {t("Manage billing, invoices and cancellation")}
        </Button>
      ) : null}
    </div>
  );
}
