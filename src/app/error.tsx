"use client";
import { Button } from "@/components/ui";
import { useT } from "@/components/i18n";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div>
        <h1 className="font-display text-5xl">{t("Something went wrong")}</h1>
        <p className="mt-3 text-muted">{t("The page could not load. Nothing was lost.")}</p>
        <Button className="mt-8" onClick={reset}>
          {t("Try again")}
        </Button>
      </div>
    </main>
  );
}
