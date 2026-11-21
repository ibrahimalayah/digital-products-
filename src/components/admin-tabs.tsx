"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/system", "System"],
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Control panel" className="mb-8 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 sm:w-fit">
      {tabs.map(([href, label]) => {
        const on = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors", on ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
