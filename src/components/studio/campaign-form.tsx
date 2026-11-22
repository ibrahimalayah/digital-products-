"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n";

type Channel = { integrationId: string | null; identifier: string; name: string };

const TIERS = [
  { cents: 0, name: msg("Organic"), note: msg("Daily posts only") },
  { cents: 50_00, name: msg("Seed"), note: msg("Test one channel") },
  { cents: 250_00, name: msg("Growth"), note: msg("Two channels, steady") },
  { cents: 1_000_00, name: msg("Scale"), note: msg("Multi-channel push") },
  { cents: 5_000_00, name: msg("Launch"), note: msg("Full launch month") },
];

export function CampaignForm({
  products,
  defaultProduct,
  channels,
  connected,
  publisherName,
  limits,
}: {
  products: { id: string; title: string }[];
  defaultProduct?: string;
  channels: Channel[];
  connected: boolean;
  publisherName: string;
  limits: { plan: string; budgetLeftCents: number; postsPerDay: number };
}) {
  const router = useRouter();
  const t = useT();
  const [budget, setBudget] = useState(0);
  const [picked, setPicked] = useState<Channel[]>(channels.slice(0, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = (c: Channel) => c.integrationId ?? c.identifier;
  const toggle = (c: Channel) => setPicked((prev) => (prev.some((x) => key(x) === key(c)) ? prev.filter((x) => key(x) !== key(c)) : [...prev, c]));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api<{ campaign: { id: string } }>("/api/campaigns", {
        body: {
          productId: String(f.get("productId")),
          name: String(f.get("name")).trim(),
          objective: String(f.get("objective")),
          monthlyBudgetCents: budget,
          postsPerDay: Number(f.get("postsPerDay")),
          channels: picked,
        },
      });
      // Hand straight to the ad planner so the campaign opens with a plan.
      await api(`/api/campaigns/${campaign.id}/plan`, { method: "POST", body: {} }).catch(() => null);
      router.push(`/app/campaigns/${campaign.id}`);
    } catch (err) {
      setError(t(errorMessage(err)));
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("Product")} htmlFor="productId">
            <Select id="productId" name="productId" defaultValue={defaultProduct ?? products[0]?.id} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Campaign name")} htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={100} placeholder={t("November launch")} />
          </Field>
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium">{t("Monthly budget")}</legend>
          <p className="mt-1 text-xs text-muted">
            {t("The planner splits this across your channels. {plan} has {amount} of planned budget left.", { plan: t(limits.plan), amount: money(limits.budgetLeftCents) })}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {TIERS.map((tier) => {
              const locked = tier.cents > limits.budgetLeftCents;
              const on = budget === tier.cents;
              return (
                <button
                  key={tier.name}
                  type="button"
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() => setBudget(tier.cents)}
                  className={cn(
                    "rounded-xl border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                    on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink",
                  )}
                >
                  <span className="block font-display text-2xl leading-none">{money(tier.cents)}</span>
                  <span className="mt-1.5 block text-xs font-medium">{t(tier.name)}</span>
                  <span className={cn("block text-[11px]", on ? "opacity-70" : "text-muted")}>{locked ? t("Upgrade to unlock") : t(tier.note)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <label htmlFor="custom" className="text-muted">
              {t("Or a custom amount")}
            </label>
            <span className="text-muted">$</span>
            <Input id="custom" type="number" min={0} max={Math.floor(limits.budgetLeftCents / 100)} step="1" value={budget / 100} onChange={(e) => setBudget(Math.max(0, Math.round(Number(e.target.value) * 100)))} className="h-9 w-28" />
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("Objective")} htmlFor="objective">
            <Select id="objective" name="objective" defaultValue="sales">
              <option value="sales">{t("Sales")}</option>
              <option value="awareness">{t("Awareness")}</option>
              <option value="leads">{t("Email sign-ups")}</option>
            </Select>
          </Field>
          <Field label={t("Posts per day")} htmlFor="postsPerDay" hint={t("Your plan allows up to {n}.", { n: limits.postsPerDay })}>
            <Select id="postsPerDay" name="postsPerDay" defaultValue="1">
              {Array.from({ length: limits.postsPerDay }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium">{t("Channels")}</legend>
          <p className="mt-1 text-xs text-muted">
            {connected ? t("These are the text-post channels connected in your {publisher} account.", { publisher: publisherName }) : t("No publishing service is connected, so posts will be written for you to copy. Connect Buffer (free) in Settings to publish automatically.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {channels.map((c) => {
              const on = picked.some((x) => key(x) === key(c));
              return (
                <button key={key(c)} type="button" aria-pressed={on} onClick={() => toggle(c)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", on ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink")}>
                  {c.name}
                  {connected ? <span className="ms-1.5 text-xs opacity-60">{c.identifier}</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? <Notice>{error}</Notice> : null}
        <Button type="submit" loading={busy} disabled={picked.length === 0 || products.length === 0}>
          {t(busy ? "Planning your campaign" : "Create and plan campaign")}
        </Button>
      </form>
    </Card>
  );
}
