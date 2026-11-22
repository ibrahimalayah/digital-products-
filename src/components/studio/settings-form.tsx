"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Badge, Button, Card, Field, Input, Notice, Textarea, Select } from "@/components/ui";
import { LANGUAGES } from "@/lib/languages";
import { LANG_COOKIE } from "@/lib/locale";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n";

type Kind = "buffer" | "postiz";
type Settings = { brandName: string; brandVoice: string; language: string; publisher: Kind; publisherConnected: boolean };

// Kept in step with src/lib/publishers.ts, which the server uses.
const SERVICES: Record<Kind, { name: string; tag: string; summary: string; keyHelp: string; link: string }> = {
  buffer: {
    name: "Buffer",
    tag: msg("Free"),
    summary: msg("Free for up to 3 channels. Publishes text posts to X, LinkedIn, Facebook, Threads, Bluesky, Mastodon and Google Business."),
    keyHelp: msg("In Buffer, open Settings → API and create a key."),
    link: "publish.buffer.com/settings/api",
  },
  postiz: {
    name: "Postiz",
    tag: msg("Paid or self-hosted"),
    summary: msg("Paid cloud plans, or free if you host it yourself. Connects to 28+ networks."),
    keyHelp: msg("In Postiz, open Settings → Developers → Public API and copy the key."),
    link: "postiz.com",
  },
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const t = useT();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [kind, setKind] = useState<Kind>(initial.publisher);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "danger" | "accent"; text: string; at: string } | null>(null);

  async function patch(name: string, body: Record<string, unknown>, ok: string) {
    setBusy(name);
    setNote(null);
    try {
      const r = await api<{ settings: Settings }>("/api/settings", { method: "PATCH", body });
      setS(r.settings);
      setNote({ tone: "accent", text: ok, at: name });
      router.refresh();
    } catch (e) {
      setNote({ tone: "danger", text: t(errorMessage(e)), at: name });
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
        <h2 className="font-display text-2xl">{t("Brand")}</h2>
        <p className="mt-1 text-sm text-muted">{t("Shown on your PDF covers and used by every agent when it writes.")}</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void patch("brand", { brandName: String(f.get("brandName") ?? "").trim(), brandVoice: String(f.get("brandVoice") ?? "").trim(), language: String(f.get("language") ?? "en") }, t("Brand saved."));
            // Keep the site in the same language as the agents.
            document.cookie = `${LANG_COOKIE}=${String(f.get("language") ?? "en")}; path=/; max-age=31536000; samesite=lax`;
          }}
        >
          <Field label={t("Brand name")} htmlFor="brandName">
            <Input id="brandName" name="brandName" defaultValue={s.brandName} maxLength={80} placeholder={t("Calm Money Studio")} />
          </Field>
          <Field label={t("Brand voice")} htmlFor="brandVoice" hint={t("A sentence or two. Example: plain-spoken, encouraging, never salesy.")}>
            <Textarea id="brandVoice" name="brandVoice" defaultValue={s.brandVoice} maxLength={600} rows={3} />
          </Field>
          <Field label={t("Language")} htmlFor="language" hint={t("Ideas, products, posts and video scripts are written in this language. New products keep the language they were made in.")}>
            <Select id="language" name="language" defaultValue={s.language}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {t(l.name)}
                </option>
              ))}
            </Select>
          </Field>
          {note?.at === "brand" ? <Notice tone={note.tone}>{note.text}</Notice> : null}
          <Button type="submit" variant="secondary" loading={busy === "brand"}>
            {t("Save brand")}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">{t("Publishing")}</h2>
          <Badge tone={s.publisherConnected ? "accent" : "neutral"}>{s.publisherConnected ? t("Connected to {service}", { service: SERVICES[s.publisher].name }) : t("Not connected")}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{t("Connect one service and approved posts are scheduled to your social accounts. Without one, you can still copy every post by hand.")}</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("Publishing service")}>
          {(Object.keys(SERVICES) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setNote(null);
              }}
              className={cn("rounded-xl border p-4 text-start transition-colors", kind === k ? "border-ink bg-sunken" : "border-line hover:border-muted")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{SERVICES[k].name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", k === "buffer" ? "bg-accent-soft text-accent" : "bg-sunken text-muted")}>{t(SERVICES[k].tag)}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted">{t(SERVICES[k].summary)}</span>
            </button>
          ))}
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const key = String(new FormData(form).get("publisherKey") ?? "").trim();
            void patch("publisher", { publisher: kind, publisherKey: key }, t("{service} connected. Your channels are available in new campaigns.", { service: service.name })).then(() => form.reset());
          }}
        >
          <Field label={t("{service} API key", { service: service.name })} htmlFor="publisherKey" hint={t("{help} ({link}) The key is encrypted before it is stored and never shown again.", { help: t(service.keyHelp), link: service.link })}>
            <Input
              id="publisherKey"
              name="publisherKey"
              type="password"
              autoComplete="off"
              required
              minLength={8}
              maxLength={400}
              placeholder={connectedHere ? t("Paste a new key to replace the saved one") : t("Paste your {service} API key", { service: service.name })}
            />
          </Field>
          {connectedElsewhere ? <p className="text-xs text-muted">{t("Connecting {service} replaces your {other} connection.", { service: service.name, other: SERVICES[s.publisher].name })}</p> : null}
          {note?.at === "publisher" ? <Notice tone={note.tone}>{note.text}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={busy === "publisher"}>
              {connectedHere ? t("Replace key") : t("Connect {service}", { service: service.name })}
            </Button>
            {s.publisherConnected ? (
              <Button type="button" variant="ghost" onClick={() => patch("publisher", { publisherKey: null }, t("Publishing disconnected."))}>
                {t("Disconnect")}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
