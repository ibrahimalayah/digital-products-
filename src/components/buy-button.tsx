"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "./ui";
import { api, errorMessage } from "@/lib/client";
import { useT } from "./i18n";

export function BuyButton({ slug, label, signedIn }: { slug: string; label: string; signedIn: boolean }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    if (!signedIn) {
      router.push(`/sign-up?next=${encodeURIComponent(`/store/${slug}`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/checkout", { body: { kind: "product", slug } });
      window.location.assign(url);
    } catch (e) {
      setError(t(errorMessage(e)));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={buy} loading={loading}>
        {label}
      </Button>
      {error ? <Notice>{error}</Notice> : null}
    </div>
  );
}
