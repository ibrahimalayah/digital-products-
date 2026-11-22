"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Field, Notice, Select } from "@/components/ui";
import { VIDEO_LENGTHS, VOICES } from "@/lib/voices";

export function VideoForm({ products, defaultProduct, remaining }: { products: { id: string; title: string }[]; defaultProduct?: string; remaining: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { video } = await api<{ video: { id: string } }>("/api/videos", {
        body: { productId: String(f.get("productId")), seconds: Number(f.get("seconds")), goal: String(f.get("goal")), voice: String(f.get("voice")) },
      });
      router.push(`/app/videos/${video.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr_auto] lg:items-end">
        <Field label="Product" htmlFor="productId">
          <Select id="productId" name="productId" defaultValue={defaultProduct ?? products[0]?.id} required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Length" htmlFor="seconds">
          <Select id="seconds" name="seconds" defaultValue="30">
            {VIDEO_LENGTHS.map((s) => (
              <option key={s} value={s}>
                {s} seconds
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Goal" htmlFor="goal">
          <Select id="goal" name="goal" defaultValue="leads">
            <option value="leads">Leads: tap the link</option>
            <option value="sales">Sales: buy today</option>
          </Select>
        </Field>
        <Field label="Voice" htmlFor="voice">
          <Select id="voice" name="voice" defaultValue="af_heart">
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" loading={busy} disabled={remaining <= 0 || products.length === 0}>
          {busy ? (
            "Writing the script"
          ) : (
            <>
              <Clapperboard className="size-4" aria-hidden /> Write script
            </>
          )}
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted">
        <span className="font-mono">{remaining} videos left this month.</span> The script takes about 20 seconds. You add your presenter and make the file on the next screen.
      </p>
      {error ? (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      ) : null}
    </Card>
  );
}
