"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";
import { useT } from "@/components/i18n";

const tabs = [
  ["/admin", msg("Overview")],
  ["/admin/users", msg("Users")],
  ["/admin/orders", msg("Orders")],
  ["/admin/products", msg("Products")],
  ["/admin/system", msg("System")],
];

export function AdminTabs() {
  const path = usePathname();
  const t = useT();
  return (
    <nav aria-label={t("Control panel")} className="mb-8 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 sm:w-fit">
      {tabs.map(([href, label]) => {
        const on = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors", on ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
