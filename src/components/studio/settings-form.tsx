"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Badge, Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";

type Settings = { brandName: string; brandVoice: string; postizConnected: boolean };

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
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
          <h2 className="font-display text-2xl">Postiz</h2>
          <Badge tone={s.postizConnected ? "accent" : "neutral"}>{s.postizConnected ? "Connected" : "Not connected"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Postiz publishes to X, LinkedIn, Instagram, Facebook, TikTok, Pinterest and more. Paste the API key from Postiz → Settings → Developers → Public API. It is encrypted before it is stored and never shown again.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const key = String(new FormData(form).get("postizKey") ?? "").trim();
            void patch("postiz", { postizKey: key }, "Postiz connected. Your channels are available in new campaigns.").then(() => form.reset());
          }}
        >
          <Field label="API key" htmlFor="postizKey">
            <Input id="postizKey" name="postizKey" type="password" autoComplete="off" required minLength={8} maxLength={300} placeholder={s.postizConnected ? "Paste a new key to replace the saved one" : "Paste your Postiz API key"} />
          </Field>
          {msg?.at === "postiz" ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={busy === "postiz"}>
              {s.postizConnected ? "Replace key" : "Connect Postiz"}
            </Button>
            {s.postizConnected ? (
              <Button type="button" variant="ghost" onClick={() => patch("postiz", { postizKey: null }, "Postiz disconnected.")}>
                Disconnect
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
