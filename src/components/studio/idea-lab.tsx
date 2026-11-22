"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Empty, Input, Notice } from "@/components/ui";
import { money } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n";

export type Idea = { id: string; niche: string; title: string; promise: string; audience: string; format: string; proof: string; suggestedPriceCents: number };

const examples = [msg("Kids activity book, ages 5 to 8"), msg("Debt and money stress"), msg("New puppy owners"), msg("First-time landlords"), msg("Wedding planning on a budget")];

export function IdeaLab({ initial, remaining, startNiche = "" }: { initial: Idea[]; remaining: number; startNiche?: string }) {
  const t = useT();
  const router = useRouter();
  const [ideas, setIdeas] = useState(initial);
  const [niche, setNiche] = useState(startNiche);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(remaining);

  async function research(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ ideas: Idea[] }>("/api/ideas", { body: { niche } });
      setIdeas((prev) => [...res.ideas, ...prev]);
      setLeft((n) => Math.max(0, n - 1));
    } catch (err) {
      setError(t(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  async function build(id: string) {
    setBuilding(id);
    setError(null);
    try {
      const { product } = await api<{ product: { id: string } }>("/api/products", { body: { ideaId: id } });
      router.push(`/app/products/${product.id}`);
    } catch (err) {
      setError(t(errorMessage(err)));
      setBuilding(null);
    }
  }

  async function remove(id: string) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    await api(`/api/ideas/${id}`, { method: "DELETE" }).catch(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-6">
        <form onSubmit={research} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="niche" className="sr-only">
            {t("Niche or audience")}
          </label>
          <Input id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder={t("A niche, an audience or a problem")} required minLength={3} maxLength={200} className="flex-1" />
          <Button type="submit" loading={busy} disabled={left <= 0}>
            {busy ? (
              t("Researching")
            ) : (
              <>
                <Search className="size-4" aria-hidden /> {t("Find ideas")}
              </>
            )}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{t("Try:")}</span>
          {examples.map((x) => (
            <button key={x} type="button" onClick={() => setNiche(t(x))} className="rounded-full border border-line px-2.5 py-1 hover:border-ink hover:text-ink">
              {t(x)}
            </button>
          ))}
          <span className="ms-auto font-mono">{t("{n} runs left this month", { n: left })}</span>
        </div>
        {busy ? <p className="mt-4 animate-pulse text-sm text-muted">{t("The idea scout is working. This takes about 20 seconds.")}</p> : null}
        {error ? (
          <div className="mt-4">
            <Notice>{error}</Notice>
          </div>
        ) : null}
      </Card>

      {busy ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-6">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton mt-3 h-8 w-3/4" />
              <div className="skeleton mt-5 h-3 w-full" />
              <div className="skeleton mt-2 h-3 w-5/6" />
              <div className="skeleton mt-5 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : null}

      {ideas.length === 0 && busy ? null : ideas.length === 0 ? (
        <Empty title={t("No ideas yet")} body={t("Describe who you want to help. The scout comes back with six specific products you could build today.")} />
      ) : (
        <ol className="grid gap-4 md:grid-cols-2">
          {ideas.map((i) => (
            <li key={i.id}>
              <Card className="lift flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{i.niche}</p>
                  <button onClick={() => remove(i.id)} className="text-muted hover:text-danger" aria-label={t("Delete idea {title}", { title: i.title })}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <h2 className="mt-2 font-display text-[28px] leading-[1.1]">{i.title}</h2>
                <dl className="mt-4 flex-1 space-y-3 text-sm">
                  {[
                    [t("Promise"), i.promise],
                    [t("For"), i.audience],
                    [t("Format"), i.format],
                    [t("Why it could sell"), i.proof],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-accent">{k}</dt>
                      <dd className="mt-0.5 leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm text-muted">
                    {t("Suggested price")} <span className="font-mono text-ink">{money(i.suggestedPriceCents)}</span>
                  </span>
                  <Button size="sm" onClick={() => build(i.id)} loading={building === i.id}>
                    {t("Build this")} <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
