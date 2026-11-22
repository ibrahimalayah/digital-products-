"use client";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { LANG_COOKIE, NATIVE_NAMES } from "@/lib/locale";
import { cn } from "@/lib/cn";

/**
 * Lets a visitor choose their language. The choice is remembered in a cookie
 * for a year and, when they are signed in, also becomes the language their
 * agents write in.
 */
export function LanguagePicker({ value, label, className, compact }: { value: LanguageId; label: string; className?: string; compact?: boolean }) {
  const router = useRouter();

  async function choose(id: string) {
    document.cookie = `${LANG_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    // Signed-out visitors get a 401 here, which is fine: the cookie is enough for them.
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: id }) }).catch(() => undefined);
    router.refresh();
  }

  return (
    <label className={cn("relative inline-flex items-center text-sm text-muted hover:text-ink", className)}>
      <Globe className="pointer-events-none absolute start-2 size-4" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        title={label}
        value={value}
        onChange={(e) => choose(e.target.value)}
        // On a phone only the globe shows; the list still opens with full names.
        className={cn("h-9 cursor-pointer appearance-none rounded-full border border-transparent bg-transparent ps-8 pe-2 text-sm hover:border-line focus:border-ink focus:outline-none max-sm:w-8 max-sm:pe-0 max-sm:text-transparent", compact && "w-8 pe-0 text-transparent")}
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {NATIVE_NAMES[l.id]}
          </option>
        ))}
      </select>
    </label>
  );
}
