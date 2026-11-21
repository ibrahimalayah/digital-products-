"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pause, Play, Send, Sparkles, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Badge, Button, Card, Notice, Textarea, statusTone } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import type { BudgetPlan } from "@/lib/types";

export type BoardCampaign = { id: string; name: string; status: string; objective: string; monthlyBudgetCents: number; postsPerDay: number; plan: BudgetPlan | null };
export type BoardPost = { id: string; channel: string; integrationId: string | null; angle: string; content: string; scheduledAt: string; status: string; error: string | null };

const dayLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

function groupByDay(posts: BoardPost[]): [string, BoardPost[]][] {
  const groups = new Map<string, BoardPost[]>();
  for (const p of posts) {
    const key = dayLabel(p.scheduledAt);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()];
}

function PostCard({ post, onChange, onGone }: { post: BoardPost; onChange: (p: BoardPost) => void; onGone: (id: string) => void }) {
  const [text, setText] = useState(post.content);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const locked = post.status === "scheduled" || post.status === "sending";

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const save = (extra: Record<string, unknown> = {}) =>
    api<{ post: BoardPost }>(`/api/posts/${post.id}`, { method: "PATCH", body: { ...(text !== post.content ? { content: text } : {}), ...extra } }).then((r) => onChange(r.post));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{post.channel}</span>
          {post.angle ? <span className="text-xs text-muted">· {post.angle}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <time className="text-xs text-muted">{dateTime(post.scheduledAt)}</time>
          <Badge tone={statusTone(post.status)}>{post.status}</Badge>
        </div>
      </div>
      <label className="sr-only" htmlFor={`post-${post.id}`}>
        Post text
      </label>
      <Textarea id={`post-${post.id}`} value={text} onChange={(e) => setText(e.target.value)} disabled={locked} rows={5} className="mt-3 text-[15px]" />
      {post.error ? <p className="mt-2 text-xs text-danger">{post.error}</p> : null}
      {error ? (
        <div className="mt-2">
          <Notice>{error}</Notice>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!locked ? (
          <>
            {text !== post.content ? (
              <Button size="sm" variant="secondary" loading={busy === "save"} onClick={() => run("save", () => save())}>
                Save edit
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" loading={busy === "approve"} onClick={() => run("approve", () => save({ approved: post.status !== "approved" }))}>
              <Check className="size-3.5" aria-hidden /> {post.status === "approved" ? "Unapprove" : "Approve"}
            </Button>
            {post.integrationId ? (
              <Button
                size="sm"
                loading={busy === "publish"}
                onClick={() =>
                  run("publish", async () => {
                    if (text !== post.content) await save();
                    const r = await api<{ post: BoardPost }>(`/api/posts/${post.id}/publish`, { method: "POST", body: {} });
                    onChange(r.post);
                  })
                }
              >
                <Send className="size-3.5" aria-hidden /> Publish
              </Button>
            ) : null}
          </>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Copy className="size-3.5" aria-hidden /> {copied ? "Copied" : "Copy"}
        </Button>
        {!locked ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-muted"
            aria-label="Discard post"
            loading={busy === "discard"}
            onClick={() =>
              run("discard", async () => {
                await api(`/api/posts/${post.id}`, { method: "DELETE" });
                onGone(post.id);
              })
            }
          >
            <X className="size-3.5" aria-hidden /> Discard
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function CampaignBoard({ campaign, initialPosts, publisherConnected }: { campaign: BoardCampaign; initialPosts: BoardPost[]; publisherConnected: boolean }) {
  const router = useRouter();
  const [c, setC] = useState(campaign);
  const [posts, setPosts] = useState(initialPosts);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: string) =>
    run("status", async () => {
      const r = await api<{ campaign: BoardCampaign }>(`/api/campaigns/${c.id}`, { method: "PATCH", body: { status } });
      setC(r.campaign);
    });

  return (
    <div className="space-y-6">
      {error ? <Notice>{error}</Notice> : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              <span className="text-sm text-muted">
                {c.objective} · {c.postsPerDay} post{c.postsPerDay === 1 ? "" : "s"}/day
              </span>
            </div>
            <p className="mt-3 font-display text-5xl">
              {money(c.monthlyBudgetCents)}
              <span className="font-sans text-sm text-muted"> /month planned</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={busy === "plan"} onClick={() => run("plan", async () => setC((await api<{ campaign: BoardCampaign }>(`/api/campaigns/${c.id}/plan`, { method: "POST", body: {} })).campaign))}>
              <Sparkles className="size-4" aria-hidden /> {c.plan ? "Replan" : "Plan budget"}
            </Button>
            {c.status === "active" ? (
              <Button variant="secondary" loading={busy === "status"} onClick={() => setStatus("paused")}>
                <Pause className="size-4" aria-hidden /> Pause
              </Button>
            ) : (
              <Button loading={busy === "status"} onClick={() => setStatus("active")}>
                <Play className="size-4" aria-hidden /> Activate
              </Button>
            )}
          </div>
        </div>

        {c.plan ? (
          <div className="mt-6 border-t border-line pt-6">
            <p className="max-w-2xl leading-relaxed">{c.plan.summary}</p>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
              {c.plan.allocations.map((a, i) => (
                <div key={a.channel} style={{ width: `${a.percent}%`, opacity: 1 - i * 0.18 }} className="bg-accent" />
              ))}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.plan.allocations.map((a, i) => (
                <li key={a.channel} className="rounded-xl border border-line p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-2 font-medium capitalize">
                      <span className="size-2.5 rounded-full bg-accent" style={{ opacity: 1 - i * 0.18 }} aria-hidden />
                      {a.channel}
                    </span>
                    <span className="font-mono text-sm">
                      {a.percent}% · {money(Math.round((c.monthlyBudgetCents * a.percent) / 100))}
                    </span>
                  </div>
                  {a.rationale ? <p className="mt-1.5 text-sm text-muted">{a.rationale}</p> : null}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Cadence</p>
                <p className="mt-1 leading-relaxed">{c.plan.cadence}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Angles</p>
                <ul className="mt-1 space-y-0.5">
                  {c.plan.angles.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Track</p>
                <ul className="mt-1 space-y-0.5">
                  {c.plan.kpis.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 text-xs text-muted">Kitforge writes and schedules your organic posts. Use the allocation above when you set paid budgets inside each network&apos;s ads manager; spend there is billed by the network.</p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">No plan yet. Run the ad planner to split this budget across your channels.</p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Posts</h2>
          {!publisherConnected ? <p className="text-sm text-muted">No publishing service is connected. Copy posts by hand, or connect Buffer (free) in Settings to publish from here.</p> : null}
        </div>
        <Button
          loading={busy === "posts"}
          onClick={() =>
            run("posts", async () => {
              const r = await api<{ posts: BoardPost[] }>(`/api/campaigns/${c.id}/posts`, { method: "POST", body: {} });
              setPosts((prev) => [...r.posts, ...prev]);
            })
          }
        >
          <Sparkles className="size-4" aria-hidden /> Write today&apos;s posts
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">No posts yet. The daily poster writes {c.postsPerDay} a day once you ask, or automatically with autopilot on.</p>
      ) : (
        <div className="space-y-8">
          {groupByDay(posts).map(([day, items]) => (
            <section key={day} aria-label={day}>
              <h3 className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                {day}
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span>
                  {items.length} post{items.length === 1 ? "" : "s"}
                </span>
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((p) => (
                  <PostCard key={p.id} post={p} onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))} onGone={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
