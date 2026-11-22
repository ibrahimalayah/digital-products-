"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Input, Notice } from "./ui";
import { api, errorMessage } from "@/lib/client";
import { useT } from "./i18n";

/** "Not ready to buy?" A visitor leaves their email so the seller can follow up. */
export function LeadForm({ productId }: { productId: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/leads/subscribe", { body: { productId, email: String(f.get("email")).trim(), consent: f.get("consent") === "on" } });
      setDone(true);
    } catch (err) {
      setError(t(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Notice tone="accent">{t("Thank you. The seller can now send you tips and offers for this product.")}</Notice>;
  return (
    <form onSubmit={submit} className="rounded-2xl border border-line p-5">
      <p className="font-medium">{t("Not ready to buy yet?")}</p>
      <p className="mt-1 text-sm text-muted">{t("Leave your email and the seller can send you tips and offers for this product.")}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="lead-email" className="sr-only">
          {t("Email")}
        </label>
        <Input id="lead-email" name="email" type="email" required maxLength={200} placeholder={t("you@example.com")} autoComplete="email" className="flex-1" />
        <Button type="submit" variant="secondary" loading={busy}>
          {t("Keep me posted")}
        </Button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>
          {t("I agree to be emailed about this product. See the")}{" "}
          <Link href="/terms" className="underline hover:text-ink">
            {t("terms and privacy note")}
          </Link>
          .
        </span>
      </label>
      {error ? (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      ) : null}
    </form>
  );
}
