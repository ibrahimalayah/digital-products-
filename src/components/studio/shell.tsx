"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Clapperboard, CreditCard, FileText, LayoutDashboard, Library, Lightbulb, LogOut, Megaphone, Settings, ShieldCheck, Store, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";
import { useLang, useT } from "@/components/i18n";
import { LanguagePicker } from "@/components/language-picker";

const nav = [
  { href: "/app", label: msg("Overview"), icon: LayoutDashboard, exact: true },
  { href: "/app/ideas", label: msg("Idea lab"), icon: Lightbulb, exact: false },
  { href: "/app/products", label: msg("Products"), icon: FileText, exact: false },
  { href: "/app/campaigns", label: msg("Campaigns"), icon: Megaphone, exact: false },
  { href: "/app/videos", label: msg("Lead videos"), icon: Clapperboard, exact: false },
  { href: "/app/leads", label: msg("Leads"), icon: Users, exact: false },
  { href: "/app/agents", label: msg("Agents"), icon: Bot, exact: false },
  { href: "/app/library", label: msg("Library"), icon: Library, exact: false },
  { href: "/app/billing", label: msg("Billing"), icon: CreditCard, exact: false },
  { href: "/app/settings", label: msg("Settings"), icon: Settings, exact: false },
];

export function Shell({ user, children }: { user: { name: string; email: string; plan: string; admin: boolean; upgrade?: boolean }; children: React.ReactNode }) {
  const t = useT();
  const lang = useLang();
  const path = usePathname();
  const items = user.admin ? [...nav, { href: "/admin", label: msg("Control panel"), icon: ShieldCheck, exact: false }] : nav;
  const active = (href: string, exact: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/"; // full reload clears all client state on sign-out
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <aside className="border-line bg-surface/50 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-e">
        <div className="flex h-16 items-center justify-between px-4 lg:px-5">
          <Link href="/app" aria-label={t("Studio home")}>
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/store" className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label={t("Open the store")} title={t("Open the store")}>
              <Store className="size-[18px]" />
            </Link>
          </div>
        </div>
        <div className="px-3 pb-3">
          <LanguagePicker full value={lang} label={t("Language")} className="flex w-full" />
        </div>
        <nav aria-label={t("Studio")} className="flex gap-1 overflow-x-auto border-b border-line px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-0 lg:pb-0">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active(it.href, it.exact) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                active(it.href, it.exact) ? "bg-ink text-bg" : "text-muted hover:bg-sunken hover:text-ink",
              )}
            >
              <it.icon className="size-4" aria-hidden />
              {t(it.label)}
            </Link>
          ))}
        </nav>
        {user.upgrade ? (
          <Link href="/app/billing" className="mx-3 mb-3 hidden rounded-2xl bg-accent p-4 text-on-accent transition-opacity hover:opacity-90 lg:block">
            <p className="text-sm font-medium">{t("Unlock autopilot")}</p>
            <p className="mt-0.5 text-xs opacity-80">{t("Bigger budgets and daily posts on Pro.")}</p>
          </Link>
        ) : null}
        <div className="hidden border-t border-line p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-bg" aria-hidden>
              {user.name.trim().charAt(0).toUpperCase() || "K"}
            </span>
            <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/app/billing" className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
              {t(user.plan)}
            </Link>
            <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
              <LogOut className="size-3.5" aria-hidden /> {t("Sign out")}
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
        <button onClick={signOut} className="mt-12 flex items-center gap-1.5 text-xs text-muted hover:text-ink lg:hidden">
          <LogOut className="size-3.5" aria-hidden /> {t("Sign out ({email})", { email: user.email })}
        </button>
      </main>
    </div>
  );
}
