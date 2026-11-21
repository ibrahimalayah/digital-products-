"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Megaphone, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { AButton, Badge, Button, Card, Field, Input, LinkButton, Notice, Select, Textarea, statusTone } from "@/components/ui";
import { ProductCover } from "@/components/product-cover";
import type { Block, ProductOutline, ProductSection } from "@/lib/types";

export type StudioProduct = {
  id: string;
  slug: string;
  title: string;
  promise: string;
  audience: string;
  format: string;
  tone: string;
  pageSize: string;
  accent: string;
  priceCents: number;
  status: string;
  outline: ProductOutline | null;
  sections: ProductSection[];
};

const ACCENTS = ["#17604f", "#1d3f72", "#8a2f3b", "#a0611a", "#4a3a7a", "#1b1a17"];

function BlockPreview({ b }: { b: Block }) {
  if (b.type === "steps" || b.type === "checklist" || b.type === "fill") {
    return (
      <div>
        {b.title ? <p className="text-[13px] font-semibold">{b.title}</p> : null}
        <ul className="mt-1.5 space-y-1 text-sm">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-4 shrink-0 font-mono text-xs leading-5 text-accent">{b.type === "steps" ? `${i + 1}.` : b.type === "checklist" ? "☐" : "?"}</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (b.type === "template") {
    return (
      <div>
        {b.title ? <p className="text-[13px] font-semibold">{b.title}</p> : null}
        <pre className="mt-1.5 whitespace-pre-wrap rounded-lg border border-line bg-sunken p-3 font-mono text-xs leading-relaxed">{b.text}</pre>
      </div>
    );
  }
  if (b.type === "tip" || b.type === "stuck") {
    return (
      <div className="rounded-lg border-l-2 border-accent bg-sunken px-3 py-2 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">{b.type === "tip" ? "Pro tip" : "If you're stuck"}</p>
        <p className="mt-0.5">{b.text}</p>
      </div>
    );
  }
  return <p className="text-sm leading-relaxed">{b.text}</p>;
}

export function ProductStudio({ initial, isAdmin, storeReady }: { initial: StudioProduct; isAdmin: boolean; storeReady: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [progress, setProgress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = p.outline?.sections.length ?? 0;
  const written = p.sections.filter(Boolean).length;
  const hasPages = written > 0;
  const incomplete = p.outline !== null && written < total;

  async function writeSections(from: StudioProduct) {
    let cur = from;
    const n = cur.outline?.sections.length ?? 0;
    for (let i = 0; i < n; i++) {
      if (cur.sections[i]) continue;
      setProgress(`Writing section ${i + 1} of ${n}: ${cur.outline!.sections[i].title}`);
      const res = await api<{ product: StudioProduct }>(`/api/products/${cur.id}/generate`, { body: { step: "section", index: i } });
      cur = res.product;
      setP(cur);
    }
  }

  async function generate(fresh: boolean) {
    setError(null);
    try {
      let cur = p;
      if (fresh) {
        setProgress("Planning the outline");
        cur = (await api<{ product: StudioProduct }>(`/api/products/${p.id}/generate`, { body: { step: "outline" } })).product;
        setP(cur);
      }
      await writeSections(cur);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api<{ product: StudioProduct }>(`/api/products/${p.id}`, { method: "PATCH", body });
      setP(res.product);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    void patch({
      title: get("title"),
      promise: get("promise"),
      audience: get("audience"),
      format: get("format"),
      tone: get("tone"),
      pageSize: get("pageSize"),
      priceCents: Math.round(Number(get("price")) * 100),
      accent: p.accent,
    });
  }

  async function remove() {
    if (!window.confirm("Remove this product and its campaigns? This cannot be undone.")) return;
    try {
      await api(`/api/products/${p.id}`, { method: "DELETE" });
      router.push("/app/products");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const busy = progress !== null;
  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <ProductCover title={p.title} subtitle={p.outline?.subtitle || p.promise} accent={p.accent} />
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Cover colour">
          {ACCENTS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={p.accent === c}
              aria-label={`Colour ${c}`}
              onClick={() => patch({ accent: c })}
              className="grid size-7 place-items-center rounded-full border border-line"
              style={{ backgroundColor: c }}
            >
              {p.accent === c ? <Check className="size-3.5 text-white" aria-hidden /> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(p.status)}>{p.status}</Badge>
          {total ? (
            <span className="font-mono text-xs text-muted">
              {written}/{total} sections
            </span>
          ) : null}
        </div>
        <div className="grid gap-2">
          {hasPages ? (
            <AButton href={`/api/products/${p.id}/pdf`} variant="secondary">
              <Download className="size-4" aria-hidden /> Download PDF
            </AButton>
          ) : null}
          {hasPages ? (
            <LinkButton href={`/app/campaigns/new?product=${p.id}`} variant="secondary">
              <Megaphone className="size-4" aria-hidden /> Promote it
            </LinkButton>
          ) : null}
          {isAdmin && (p.status === "ready" || p.status === "published") ? (
            <Button onClick={() => patch({ published: p.status !== "published" })} loading={saving} variant={p.status === "published" ? "secondary" : "primary"}>
              {p.status === "published" ? "Remove from store" : "Publish to store"}
            </Button>
          ) : null}
          {isAdmin && p.status === "published" ? (
            <LinkButton href={`/store/${p.slug}`} variant="ghost" size="sm">
              View store page
            </LinkButton>
          ) : null}
          {isAdmin && !storeReady ? <p className="text-xs text-muted">Connect Stripe before buyers can check out.</p> : null}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {error ? <Notice>{error}</Notice> : null}

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Pages</h2>
              <p className="mt-1 text-sm text-muted">
                {hasPages ? "Review what the writer produced. Regenerating uses one product credit." : "The writer plans an outline, then writes each section in full. About two minutes."}
              </p>
            </div>
            <div className="flex gap-2">
              {incomplete && !busy ? (
                <Button onClick={() => generate(false)} variant="secondary">
                  Resume writing
                </Button>
              ) : null}
              <Button onClick={() => generate(true)} loading={busy} disabled={p.status === "published"} variant={hasPages ? "secondary" : "primary"}>
                {busy ? null : hasPages ? <RefreshCw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                {busy ? "Working" : hasPages ? "Regenerate" : "Generate product"}
              </Button>
            </div>
          </div>
          {busy ? (
            <div className="mt-5" role="status">
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${total ? Math.max(8, (written / total) * 100) : 8}%` }} />
              </div>
              <p className="mt-2 animate-pulse text-sm text-muted">{progress}</p>
            </div>
          ) : null}

          {p.outline ? (
            <div className="mt-6 space-y-3">
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-sm font-medium">Welcome page</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{p.outline.welcome}</p>
                <ul className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                  {p.outline.howToUse.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
              {p.outline.sections.map((o, i) => {
                const sec = p.sections[i];
                return (
                  <details key={i} className="rounded-xl border border-line p-4" open={i === 0 && Boolean(sec)}>
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                      <span>
                        <span className="mr-2 font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                        {o.title}
                      </span>
                      <span className="text-xs font-normal text-muted">{sec ? `${sec.pages.length} pages` : "Not written yet"}</span>
                    </summary>
                    {sec ? (
                      <div className="mt-4 space-y-6">
                        {sec.pages.map((pg, j) => (
                          <article key={j} className="border-t border-line pt-4">
                            <h3 className="font-display text-xl">{pg.heading}</h3>
                            <p className="text-sm text-muted">Goal: {pg.goal}</p>
                            <div className="mt-3 space-y-3">
                              {pg.blocks.map((b, k) => (
                                <BlockPreview key={k} b={b} />
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted">{o.summary}</p>
                    )}
                  </details>
                );
              })}
              {p.outline.extras.length ? <p className="text-sm text-muted">Extras at the back: {p.outline.extras.join(", ")}.</p> : null}
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Brief</h2>
          <form onSubmit={save} className="mt-5 space-y-4">
            <Field label="Product name" htmlFor="title">
              <Input id="title" name="title" defaultValue={p.title} required minLength={3} maxLength={140} />
            </Field>
            <Field label="Promise" htmlFor="promise">
              <Textarea id="promise" name="promise" defaultValue={p.promise} required minLength={10} maxLength={400} rows={2} />
            </Field>
            <Field label="Who it is for" htmlFor="audience">
              <Input id="audience" name="audience" defaultValue={p.audience} required maxLength={400} />
            </Field>
            <Field label="What is inside" htmlFor="format">
              <Input id="format" name="format" defaultValue={p.format} required maxLength={400} />
            </Field>
            <Field label="Tone" htmlFor="tone">
              <Input id="tone" name="tone" defaultValue={p.tone} required maxLength={200} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Page size" htmlFor="pageSize">
                <Select id="pageSize" name="pageSize" defaultValue={p.pageSize}>
                  <option value="LETTER">US Letter</option>
                  <option value="A4">A4</option>
                </Select>
              </Field>
              <Field label="Price (USD)" htmlFor="price">
                <Input id="price" name="price" type="number" min={0} max={999} step="1" defaultValue={p.priceCents / 100} required />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button type="submit" variant="secondary" loading={saving}>
                  Save brief
                </Button>
                {saved ? (
                  <span className="text-sm text-accent" role="status">
                    Saved
                  </span>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={remove} className="text-danger">
                <Trash2 className="size-4" aria-hidden /> Remove
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
