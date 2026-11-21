"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client";
import { Notice } from "@/components/ui";
import { cn } from "@/lib/cn";

/** An accessible switch bound to one boolean field of /api/settings. */
export function SettingSwitch({ field, initial, label, description, locked }: { field: "autopilot" | "autoApprove"; initial: boolean; label: string; description: string; locked?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    try {
      await api("/api/settings", { method: "PATCH", body: { [field]: next } });
      router.refresh();
    } catch (e) {
      setOn(!next);
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium" id={`${field}-label`}>
            {label}
          </p>
          <p className="mt-0.5 text-sm text-muted">{locked ?? description}</p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-labelledby={`${field}-label`}
          disabled={Boolean(locked)}
          onClick={toggle}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40", on ? "bg-accent" : "bg-line")}
        >
          <span className={cn("absolute top-1 size-5 rounded-full bg-surface shadow transition-[left]", on ? "left-6" : "left-1")} />
        </button>
      </div>
      {error ? (
        <div className="mt-2">
          <Notice>{error}</Notice>
        </div>
      ) : null}
    </div>
  );
}
