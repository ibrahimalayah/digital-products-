import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { getT } from "@/lib/i18n-server";
import { Shell } from "@/components/studio/shell";
import { AdminTabs } from "@/components/admin-tabs";

// Signed-in pages are always rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t("Control panel"), template: t("%s · Kitforge control panel") }, robots: { index: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <Shell user={{ name: user.name, email: user.email, plan: getPlan(user.plan).name, admin: true }}>
      <AdminTabs />
      {children}
    </Shell>
  );
}
