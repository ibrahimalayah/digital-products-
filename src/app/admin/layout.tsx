import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { Shell } from "@/components/studio/shell";
import { AdminTabs } from "@/components/admin-tabs";

// Signed-in pages are always rendered per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Control panel", template: "%s · Kitforge control panel" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <Shell user={{ name: user.name, email: user.email, plan: getPlan(user.plan).name, admin: true }}>
      <AdminTabs />
      {children}
    </Shell>
  );
}
