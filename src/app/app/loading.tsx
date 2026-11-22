"use client";
import { useT } from "@/components/i18n";

export default function Loading() {
  const t = useT();
  return (
    <div role="status" aria-label={t("Loading")} className="space-y-8">
      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-12 w-80 max-w-full" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
