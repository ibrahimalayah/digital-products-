"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Badge, Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

type Kind = "buffer" | "postiz";
type Settings = { brandName: string; brandVoice: string; publisher: Kind; publisherConnected: boolean };

// Kept in step with src/lib/publishers.ts, which the server uses.
const SERVICES: Record<Kind, { name: string; tag: string; summary: string; keyHelp: string; link: string }> = {
  buffer: {
    name: "Buffer",
    tag: "Free",
    summary: "Free for up to 3 channels. Publishes text posts to X, LinkedIn, Facebook, Threads, Bluesky, Mastodon and Google Business.",
    keyHelp: "In Buffer, open Settings → API and create a key.",
    link: "publish.buffer.com/settings/api",
  },
  postiz: {
    name: "Postiz",
    tag: "Paid or self-hosted",
    summary: "Paid cloud plans, or free if you host it yourself. Connects to 28+ networks.",
    keyHelp: "In Postiz, open Settings → Developers → Public API and copy the key.",
    link: "postiz.com",
  },
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [kind, setKind] = useState<Kind>(initial.publisher);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "danger" | "accent"; text: string; at: string } | null>(null);

  async function patch(name: string, body: Record<string, unknown>, ok: string) {
    setBusy(name);
    setMsg(null);
    try {
      const r = await api<{ settings: Settings }>("/api/settings", { method: "PATCH", body });
      setS(r.settings);
      setMsg({ tone: "accent", text: ok, at: name });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "danger", text: errorMessage(e), at: name });
    } finally {
      setBusy(null);
    }
  }

  const service = SERVICES[kind];
  const connectedHere = s.publisherConnected && s.publisher === kind;
  const connectedElsewhere = s.publisherConnected && s.publisher !== kind;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <h2 className="font-display text-2xl">Brand</h2>
        <p className="mt-1 text-sm text-muted">Shown on your PDF covers and used by every agent when it writes.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void patch("brand", { brandName: String(f.get("brandName") ?? "").trim(), brandVoice: String(f.get("brandVoice") ?? "").trim() }, "Brand saved.");
          }}
        >
          <Field label="Brand name" htmlFor="brandName">
            <Input id="brandName" name="brandName" defaultValue={s.brandName} maxLength={80} placeholder="Calm Money Studio" />
          </Field>
          <Field label="Brand voice" htmlFor="brandVoice" hint="A sentence or two. Example: plain-spoken, encouraging, never salesy.">
            <Textarea id="brandVoice" name="brandVoice" defaultValue={s.brandVoice} maxLength={600} rows={3} />
          </Field>
          {msg?.at === "brand" ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          <Button type="submit" variant="secondary" loading={busy === "brand"}>
            Save brand
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Publishing</h2>
          <Badge tone={s.publisherConnected ? "accent" : "neutral"}>{s.publisherConnected ? `Connected to ${SERVICES[s.publisher].name}` : "Not connected"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">Connect one service and approved posts are scheduled to your social accounts. Without one, you can still copy every post by hand.</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Publishing service">
          {(Object.keys(SERVICES) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setMsg(null);
              }}
              className={cn("rounded-xl border p-4 text-left transition-colors", kind === k ? "border-ink bg-sunken" : "border-line hover:border-muted")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{SERVICES[k].name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", k === "buffer" ? "bg-accent-soft text-accent" : "bg-sunken text-muted")}>{SERVICES[k].tag}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted">{SERVICES[k].summary}</span>
            </button>
          ))}
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const key = String(new FormData(form).get("publisherKey") ?? "").trim();
            void patch("publisher", { publisher: kind, publisherKey: key }, `${service.name} connected. Your channels are available in new campaigns.`).then(() => form.reset());
          }}
        >
          <Field label={`${service.name} API key`} htmlFor="publisherKey" hint={`${service.keyHelp} (${service.link}) The key is encrypted before it is stored and never shown again.`}>
            <Input
              id="publisherKey"
              name="publisherKey"
              type="password"
              autoComplete="off"
              required
              minLength={8}
              maxLength={400}
              placeholder={connectedHere ? "Paste a new key to replace the saved one" : `Paste your ${service.name} API key`}
            />
          </Field>
          {connectedElsewhere ? <p className="text-xs text-muted">Connecting {service.name} replaces your {SERVICES[s.publisher].name} connection.</p> : null}
          {msg?.at === "publisher" ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={busy === "publisher"}>
              {connectedHere ? "Replace key" : `Connect ${service.name}`}
            </Button>
            {s.publisherConnected ? (
              <Button type="button" variant="ghost" onClick={() => patch("publisher", { publisherKey: null }, "Publishing disconnected.")}>
                Disconnect
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
