import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { Shell } from "@/components/studio/shell";

// Signed-in pages are always rendered per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Control panel", template: "%s · Kitforge control panel" }, robots: { index: false } };

const tabs = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/system", "System"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <Shell user={{ name: user.name, email: user.email, plan: getPlan(user.plan).name, admin: true }}>
      <nav aria-label="Control panel" className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm text-muted hover:border-ink hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </Shell>
  );
}
