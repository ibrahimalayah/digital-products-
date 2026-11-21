"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

type Channel = { integrationId: string | null; identifier: string; name: string };

const TIERS = [
  { cents: 0, name: "Organic", note: "Daily posts only" },
  { cents: 50_00, name: "Seed", note: "Test one channel" },
  { cents: 250_00, name: "Growth", note: "Two channels, steady" },
  { cents: 1_000_00, name: "Scale", note: "Multi-channel push" },
  { cents: 5_000_00, name: "Launch", note: "Full launch month" },
];

export function CampaignForm({
  products,
  defaultProduct,
  channels,
  connected,
  limits,
}: {
  products: { id: string; title: string }[];
  defaultProduct?: string;
  channels: Channel[];
  connected: boolean;
  limits: { plan: string; budgetLeftCents: number; postsPerDay: number };
}) {
  const router = useRouter();
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
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product" htmlFor="productId">
            <Select id="productId" name="productId" defaultValue={defaultProduct ?? products[0]?.id} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Campaign name" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="November launch" />
          </Field>
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium">Monthly budget</legend>
          <p className="mt-1 text-xs text-muted">
            The planner splits this across your channels. {limits.plan} has {money(limits.budgetLeftCents)} of planned budget left.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {TIERS.map((t) => {
              const locked = t.cents > limits.budgetLeftCents;
              const on = budget === t.cents;
              return (
                <button
                  key={t.name}
                  type="button"
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() => setBudget(t.cents)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                    on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink",
                  )}
                >
                  <span className="block font-display text-2xl leading-none">{money(t.cents)}</span>
                  <span className="mt-1.5 block text-xs font-medium">{t.name}</span>
                  <span className={cn("block text-[11px]", on ? "opacity-70" : "text-muted")}>{locked ? "Upgrade to unlock" : t.note}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <label htmlFor="custom" className="text-muted">
              Or a custom amount
            </label>
            <span className="text-muted">$</span>
            <Input id="custom" type="number" min={0} max={Math.floor(limits.budgetLeftCents / 100)} step="1" value={budget / 100} onChange={(e) => setBudget(Math.max(0, Math.round(Number(e.target.value) * 100)))} className="h-9 w-28" />
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Objective" htmlFor="objective">
            <Select id="objective" name="objective" defaultValue="sales">
              <option value="sales">Sales</option>
              <option value="awareness">Awareness</option>
              <option value="leads">Email sign-ups</option>
            </Select>
          </Field>
          <Field label="Posts per day" htmlFor="postsPerDay" hint={`Your plan allows up to ${limits.postsPerDay}.`}>
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
          <legend className="text-[13px] font-medium">Channels</legend>
          <p className="mt-1 text-xs text-muted">
            {connected ? "These are the accounts connected in your Postiz workspace." : "Postiz is not connected, so posts will be written for you to copy. Connect it in Settings to publish automatically."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {channels.map((c) => {
              const on = picked.some((x) => key(x) === key(c));
              return (
                <button key={key(c)} type="button" aria-pressed={on} onClick={() => toggle(c)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", on ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink")}>
                  {c.name}
                  {connected ? <span className="ml-1.5 text-xs opacity-60">{c.identifier}</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? <Notice>{error}</Notice> : null}
        <Button type="submit" loading={busy} disabled={picked.length === 0 || products.length === 0}>
          {busy ? "Planning your campaign" : "Create and plan campaign"}
        </Button>
      </form>
    </Card>
  );
}
