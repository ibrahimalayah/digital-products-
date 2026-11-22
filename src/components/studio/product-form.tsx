"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { useT } from "@/components/i18n";

export function NewProductForm() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const { product } = await api<{ product: { id: string } }>("/api/products", {
        body: {
          title: get("title"),
          promise: get("promise"),
          audience: get("audience"),
          format: get("format"),
          tone: get("tone") || undefined,
          pageSize: get("pageSize"),
          priceCents: Math.round(Number(get("price") || 9) * 100),
        },
      });
      router.push(`/app/products/${product.id}`);
    } catch (err) {
      setError(t(errorMessage(err)));
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-2xl p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-5">
        <Field label={t("Product name")} htmlFor="title">
          <Input id="title" name="title" required minLength={3} maxLength={140} placeholder={t("Credit Card Hardship Letter Pack")} />
        </Field>
        <Field label={t("The result it promises")} htmlFor="promise" hint={t("One sentence. The outcome, not the contents.")}>
          <Textarea id="promise" name="promise" required minLength={10} maxLength={400} rows={2} placeholder={t("Get a lower rate or a paused payment before you fall 90 days behind.")} />
        </Field>
        <Field label={t("Who it is for")} htmlFor="audience">
          <Input id="audience" name="audience" required minLength={3} maxLength={400} placeholder={t("People one or two payments behind after a job loss")} />
        </Field>
        <Field label={t("What is inside")} htmlFor="format">
          <Input id="format" name="format" required minLength={3} maxLength={400} placeholder={t("4 letter templates, a call script and a checklist")} />
        </Field>
        <Field label={t("Tone")} htmlFor="tone">
          <Input id="tone" name="tone" maxLength={200} defaultValue={t("warm, friendly and easy to read")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("Page size")} htmlFor="pageSize">
            <Select id="pageSize" name="pageSize" defaultValue="LETTER">
              <option value="LETTER">{t("US Letter")}</option>
              <option value="A4">A4</option>
            </Select>
          </Field>
          <Field label={t("Price (USD)")} htmlFor="price">
            <Input id="price" name="price" type="number" min={0} max={999} step="1" defaultValue={9} required />
          </Field>
        </div>
        {error ? <Notice>{error}</Notice> : null}
        <Button type="submit" loading={busy}>
          {t("Create brief")}
        </Button>
      </form>
    </Card>
  );
}
